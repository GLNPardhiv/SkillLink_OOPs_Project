import { User } from "../models/user.models.js";
import { ClientProfile } from "../models/clientProfile.models.js";
import { FreelancerProfile } from "../models/freelancerProfile.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js";
import { emailVerificationMailgenContent, forgetPasswordMailgenContent, sendEmail } from "../utils/mail.js"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { UserRolesEnum } from "../utils/constants.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

// Function to generate both access & refresh tokens for a user
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        //Find the user in the database by their ID
        const user = await User.findById(userId)
        //Generate a new Access Token  & refresh Token using the method defined in the user schema
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //Save the newly generated refresh token in the user's document
        user.refreshToken = refreshToken

        //Save the user object back to the database, but skip validations (like required fields, etc.)
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    }
    catch (error) {
        console.log("../backend/src/controllers/auth.controllers.js")
        throw new ApiError(500, "Something went wrong while generating access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //Extract user input from the request body
    const {email, username, password, role} = req.body

    if (![UserRolesEnum.CLIENT, UserRolesEnum.FREELANCER].includes(role)) {
        throw new ApiError(400, "Role must be either 'client' or 'freelancer'");
    }

    //Check if a user with same email or username already exists
    const existedUser = await User.findOne({email})

    if (existedUser) {
        // 409 = Conflict (duplicate resource)
        console.log("../backend/src/controllers/auth.controllers.js")
        throw new ApiError(409, "User with email or username already exists", [])
    }

    // ----------- 3️⃣ Handle file uploads (from Multer) -----------
    const avatarLocalPath = req.files?.avatar?.[0]?.path;

    // if (!avatarLocalPath) {
    //     throw new ApiError(400, "Avatar file is missing");
    // }

    let avatar

    if (avatarLocalPath) {

        try {
            avatar = await uploadOnCloudinary(avatarLocalPath)
            if (!avatar || !avatar.url) {
                throw new Error("Cloudinary did not return a valid avatar response");
            }
            console.log("✅ Avatar uploaded:", avatar.url);
        } catch (error) {
            console.error("❌ Avatar upload failed:", error);
            throw new ApiError(500, "Failed to upload avatar to Cloudinary");
        }   
    }

    try {
        //Create a new user in MongoDB (password gets hashed in pre-save hook)
        const user = await User.create({
            email,
            password,
            username,
            role, //client or freelancer
            isEmailVerified: false,
        });

        if (avatar) {
            user.avatar = {
                url: avatar.url,
                public_id: avatar.public_id
            };
        }

        // Create role-specific profile
        if (role === UserRolesEnum.CLIENT) {
            const clientProfile = await ClientProfile.create({
                user: user._id,
                companyName: "",
                about: "",
                logo: "",
                contact: "",
            });
            user.clientProfile = clientProfile._id;
        }

        if (role === UserRolesEnum.FREELANCER) {
            const freelancerProfile = await FreelancerProfile.create({
                user: user._id,
                skills: [],
                portfolio: "",
                hourlyRate: 0,
                experience: ""
            });
            user.freelancerProfile = freelancerProfile._id;
        }

        //Generate a temporary token for email verification
        const {unHashedToken, hashedToken, tokenExpiry} = user.generateTemporaryToken();

        //Store hashed token and expiry inside DB (so we can validate later)
        user.emailVerificationToken = hashedToken
        user.emailVerificationExpiry = tokenExpiry

        //Save user with the verification token (skip schema validations again)
        await user.save({validateBeforeSave: false})

        //Send email with a verification link containing the *unhashed* token
        await sendEmail({
            email: user?.email,
            subject: "Please verify your email",
            mailgenContent: emailVerificationMailgenContent(
                user.username,
                `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
            )
        });

        //Fetch user again but exclude sensitive fields (security reasons)
        const createdUser = await User.findById(user._id)
            .select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry")

        if (!createdUser) {
            console.log("../backend/src/controllers/auth.controllers.js")
            throw new ApiError(500, "Something went wrong while registering a user")
        }

        return res
            .status(201)
            .json({
                statusCode: 200,
                user: createdUser,
                message: "User registered successfully and verification email has been sent on your email"
            });   
    } catch (error) {
        console.error("❌ User creation failed:", error);

        // Cleanup Cloudinary uploads if DB creation fails
        if (avatar?.public_id) {
            await deleteFromCloudinary(avatar.public_id);
        }

        throw new ApiError(500, "Something went wrong while registering a user");
    }
});

const login = asyncHandler(async (req, res) => {
    //Extract user input from the request body
    const {email, password} = req.body

    if (!email) {
        console.log("../backend/src/controllers/auth.controllers.js")
        throw new ApiError(400, "Email is required")
    }

    //Find user by email in MongoDB
    const user = await User.findOne({email})

    if (!user) {
        console.log("../backend/src/controllers/auth.controllers.js")
        throw new ApiError(400, "User does not exist")
    }

    //Validate the password using bcrypt
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        console.log("../backend/src/controllers/auth.controllers.js")
        throw new ApiError(400, "Invalid credentials")
    }

    //Generate JWT tokens (access + refresh)
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    //Fetch sanitized user (remove sensitive fields like password, refreshToken, etc.)
    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry")

    //Define secure cookie options
    const options = {
        httpOnly: true, //Cookie cannot be accessed via JavaScript (prevents XSS attacks)
        secure: true //Cookie only sent over HTTPS (prevents MITM attacks)
    }

    return res
        .status(200)
        // Store tokens in cookies
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user:loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged in Successfully"
            )
        )
});

const logoutUser = asyncHandler(async (req, res) => {
    //Remove the refresh token from the user document in the database
    await User.findByIdAndUpdate(
        req.user._id, //The logged-in user's ID (comes from auth middleware after token verification)
        {
            $set: {
                refreshToken: "" //Clear the refresh token field
            }
        },
        {
            new: true  // Return the updated user (not really used here, but good practice)
        },
    );
    //Define cookie options
    const options = {
        httpOnly: true, //httpOnly: prevents client-side JS from accessing cookies (security)
        secure: true //secure: ensures cookies are sent only over HTTPS
    }
    return res  
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged out"
            )
        )
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res  
        .status(200) 
        .json(
            new ApiResponse(
                200,
                req.user,
                "Current user fetched Successfully"
            )
        )
})

const verifyEmail = asyncHandler(async (req, res) => {
    //Extract the "verificationToken" from the URL parameters (e.g., /verify-email/:verificationToken)
    const {verificationToken} = req.params

    if (!verificationToken) {
        console.log("../backend/src/controllers/auth.controllers.js")
        throw new ApiError(400, "Email verification token is missing")
    }

    //Hash the provided token (so we can safely compare with DB stored hash)
    let hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex")

    //Find the user with matching token and token not expired
    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: {$gt: Date.now()}
    })

    //If user not found → invalid or expired token
    if (!user) {
        console.log("../backend/src/controllers/auth.controllers.js")
        throw new ApiError(400, "Invalid or expired verification token")
    }

    //Clear verification fields so they can’t be reused
    user.emailVerificationToken = undefined
    user.emailVerificationExpiry = undefined

    user.isEmailVerified = true

    //Save user (skipping validations like password hashing)
    await user.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    isEmailVerified: true
                },
                "Email is verified"
            )
        )
})

const resendEmailVerification = asyncHandler(async (req, res) => {
    //Find the currently logged-in user using the user ID from req.user
    const user = await User.findById(req.user?._id)

    if (!user) {
        console.log("../backend/src/controllers/auth.controllers.js")
        throw new ApiError(404, "User does not exist")
    }

    if (user.isEmailVerified) {
        console.log("../backend/src/controllers/auth.controllers.js")
        throw new ApiError(409, "Email is already Verified")
    }

    //Generate a new temporary email verification token (both hashed + unhashed)
    const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();

    //Save hashed token & expiry in DB for later verification
    user.emailVerificationToken = hashedToken
    user.emailVerificationExpiry = tokenExpiry

    await user.save({validateBeforeSave: false})

    //Send a verification email with a link that contains the unhashed token
    await sendEmail({
        email: user?.email,
        subject: "Please verify your email",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
        )
    });

    return res
        .status(200)
        .json(
            200,
            {},
            "Mail has been sent to your email ID"
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    //Extract refresh token from either cookies or request body
    const incomingRefreshToken = req.body.refreshToken || req.cookies.refreshToken

    if (!incomingRefreshToken) {
        console.log("../backend/src/controllers/auth.controllers.js")
        throw new ApiError(401, "Unauthorized access")
    }

    //Wrapping logic in try–catch because jwt.verify() and DB queries may throw errors
    try {
        //Verify the refresh token using secret key
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        //Find the user based on decoded token's _id
        const user = await User.findById(decodedToken?._id)

        //If user not found in DB → token is invalid
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        //Ensure the incoming refresh token matches the one stored in DB
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired")
        }

        //Cookie options → httpOnly (not accessible by JS), secure (HTTPS only)
        const options = {
            httpOnly: true,
            secure: true
        }

        //Generate new access & refresh tokens
        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        //Save the new refresh token in DB (overwriting the old one)
        user.refreshToken = newRefreshToken
        await user.save()

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {accessToken, refreshToken: newRefreshToken},
                    "Access token refreshed"
                )
            )
    }
    catch (error) {
        //Any failure (invalid/expired token) → unauthorized
        console.log("../backend/src/controllers/auth.controllers.js")
        throw new ApiError(401, "Invalid refresh token")
    }
})

const forgotPasswordRequest = asyncHandler(async (req, res) => {
    const {email} = req.body

    const user = await User.findOne({email})

    if (!user) {
        throw new ApiError(404, "User does not exist", [])
    }

    //Generate a temporary token
    const {unHashedToken, hashedToken, tokenExpiry} = user.generateTemporaryToken()

    //Save hashed token and expiry date in DB
    user.forgotPasswordToken = hashedToken
    user.forgotPasswordExpiry = tokenExpiry

    //Save user without triggering schema validations
    await user.save({validateBeforeSave: false})

    //Send password reset email to the user
    //The unhashed token is sent in the email as part of the reset link
    await sendEmail({
        email: user?.email,
        subject: "Password reset request",
        mailgenContent: forgetPasswordMailgenContent(
            user.username,
            `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`
        ),
    })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                {},
                "Password reset mail has been sent to your email"
            )
        )
})

const resetForgotPassword = asyncHandler(async (req, res) => {
    //Extract reset token from URL params and new password from request body
    const {resetToken} = req.params
    const {newPassword} = req.body

    //Hash the reset token received in the request
    let hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex")

    //Find the user with the matching hashed token and check that the token has not expired
    const user = await User.findOne({
        forgotPasswordToken: hashedToken,
        forgotPasswordExpiry: {$gt: Date.now()}
    })

    if (!user) {
        throw new ApiError(489, "Token is invalid or expired")
    }

    //Clear the reset token and expiry from DB (one-time use only)
    user.forgotPasswordToken = undefined
    user.forgotPasswordExpiry = undefined

    //Update the user's password with the new one
    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password reset successfully"
            )
        )
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    //Extract old and new passwords from request body
    const {oldPassword, newPassword} = req.body

    //Fetch the currently logged-in user by ID from req.user
    const user = await User.findById(req.user?._id)

    //Verify that the old password matches the stored password
    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid old Password")
    }

    //The schema pre-save hook will automatically hash the password
    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res  
        .status(200)
        .json(
            new ApiResponse(
                200, 
                {},
                "Password changed successfully"
            )
        )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "File is required")
    }

    const avatar =  await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Something went wrong")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: {
                    url: avatar.url,
                    public_id: avatar.public_id
                },
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Avatar updated successfully"
            )
        )
})

export {
        registerUser, 
        login, 
        logoutUser, 
        getCurrentUser, 
        verifyEmail, 
        resendEmailVerification, 
        refreshAccessToken, 
        forgotPasswordRequest, 
        resetForgotPassword, 
        changeCurrentPassword, 
        updateUserAvatar
    }