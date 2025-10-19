import {v2 as cloudinary} from 'cloudinary'
import fs from "fs"
import dotenv from "dotenv"

dotenv.config()

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async(localFilePath) => { //Defines an async function to upload a local file to Cloudinary.
    try {
        //Returns null immediately if localFilePath is empty (prevents errors).
        if (!localFilePath) {
            return null
        }
        //Uploads the file at localFilePath to Cloudinary.
        //localFilePath.replace(/\\/g, '/') ensures Windows paths (C:\...) are converted to Cloudinary-compatible format.
        //resource_type: "auto" → Cloudinary detects file type automatically (image, video, etc.).
        const response = await cloudinary.uploader.upload(
            localFilePath.replace(/\\/g, '/'), {
                resource_type: "auto"
            }
        )
        console.log("File upload on cloudinary. File src: " + response.url);
        //Deletes the local temporary file after successful upload to save disk space.
        //Checks if file exists to avoid errors.
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return response
    } catch (error) {
        console.error("Cloudinary upload error:", error.message);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log("Deleted from cloudinary", publicId);
    } catch (error) {
        console.log("Error deleting from cloudinary", error);
        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary };
