import mongoose, {Schema} from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { UserRolesEnum } from "../utils/constants.js"
//This defines a User schema for MongoDB using Mongoose.
//A schema is like a blueprint → it tells MongoDB what fields each document in the users collection should have, along with their types, rules, and defaults.
const userSchema = new Schema(
    {
        avatar: { //stores profile picture of user
            type: {
                url: String, //url: link if hosted on cloud (e.g., AWS S3, Cloudinary).
                public_id: String, //localPath: file path if stored locally on the server.
            },
            default: { //default: if no avatar is uploaded, these values are empty.
                url: ``, 
                public_id: "",
            }
        },
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullname: {
            type: String,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required!"],
        },
        role: {
            type: String,
            enum: [UserRolesEnum.CLIENT, UserRolesEnum.FREELANCER],
            required: true
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        clientProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ClientProfile"
        },
        freelancerProfile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FreelancerProfile"
        },
        refreshToken: { //Stores JWT refresh token for user sessions (used to re-issue new access tokens without re-login).
            type: String,
        },
        //Used for forgot/reset password flow.
        //When user requests reset → generate token, save it here, set expiry.
        //After expiry, token is invalid.
        forgotPasswordToken: {
            type: String,
        },
        forgotPasswordExpiry: {
            type: String,
        },
        //Stores token sent in verification email.
        //expiry ensures the link is only valid for a certain time.
        emailVerificationToken: {
            type: String,
        },
        emailVerificationExpiry: {
            type: String,
        },
    },
    { 
        //Automatically adds two fields: createdAt, updatedAt
        //Mongoose updates these automatically.
        timestamps: true
    }
)

//A Mongoose middleware hook that runs before a document is saved into MongoDB.
userSchema.pre("save", async function(next) { //next is a callback to move forward in the save process.
    //you have access to the current document via this.
    //this.isModified("password") → checks if the password field has been changed.
    //If the user updates their profile (say fullname or email), we don’t want to rehash an already hashed password.
    //So only hash the password if it’s new or changed.
    if (!this.isModified("password")) return next()

    //bcrypt.hash(password, saltRounds) → hashes the plain text password.
    //10 is the salt rounds (standard secure value).
    this.password = await bcrypt.hash(this.password, 10)

    //Tells Mongoose: “done with this middleware, continue saving the document”.
    next()
})

// Instance method to check if the entered password is correct
userSchema.methods.isPasswordCorrect = async function(password) {
    // 'password' is the plain text password entered by the user
    // 'this.password' is the hashed password stored in the database
    // Use bcrypt to compare the plain password with the hashed password
    // Returns true if passwords match, false otherwise
    return await bcrypt.compare(password, this.password)
}

//This adds an instance method to every document created from userSchema.
//every User object can call user.generateAccessToken().
//This method generates a JWT (JSON Web Token) for the user.
//JWTs are used for authentication: the server can verify requests without querying the database each time.
userSchema.methods.generateAccessToken = function() {
    //jwt.sign(payload, secret, options)
    return jwt.sign(
        { //payload → the data we want to encode in the token.
            _id: this._id,
            email: this.email,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET, //secret → a secret string used to sign the token. Must be kept safe.
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    )
}

//Generates a refresh token JWT.
//Refresh tokens are used to get a new access token when the old one expires, without logging in again.
//Usually longer expiry than access tokens.
userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    )
}

//Adds an instance method to every User document.
//Used to generate temporary tokens for password reset, email verification, etc.
userSchema.methods.generateTemporaryToken = function() {
    //Uses Node.js crypto module to generate 20 random bytes.
    //Converts to a hex string → 40 characters.
    //This is the token that can be sent to the user (e.g., via email).
    const unHashedToken = crypto.randomBytes(20).toString("hex")

    //Hashing ensures that the token stored in the database is secure.
    const hashedToken = crypto.createHash("sha256").update(unHashedToken).digest("hex")

    //Date.now() → current timestamp in milliseconds.
    //20 * 60 * 1000 → 20 minutes in milliseconds.
    //Token will expire 20 minutes after creation.
    const tokenExpiry = Date.now() + (20 * 60 * 1000)

    //unHashedToken → send to user (email link).
    //hashedToken → save in database for verification later.
    //tokenExpiry → store in database to check if token has expired.
    return {unHashedToken, hashedToken, tokenExpiry}
}

//mongoose.model(name, schema) creates a Mongoose model.
//A model is a class that you can use to:
//Create new documents.
//Query the database.
//Update or delete documents.
//Essentially, it connects your schema to a MongoDB collection.
export const User = mongoose.model("User", userSchema) //"User" → name of the model.
//userSchema → the schema that defines the structure, validation, and methods of each document.
