import multer from "multer"
import path from "path"
import fs from "fs"

//Builds an absolute path to the upload folder by joining the current working directory (process.cwd()) with ./public/temp.
//path.join normalizes separators (/ vs \) so it works on Windows and Unix.
const uploadPath = path.join(process.cwd(), "./public/images")

//If the uploadPath directory does not exist, create it (recursively, so intermediate directories are created if needed).
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

//Creates a Multer disk storage engine:
//destination tells Multer where to save the file (the uploadPath we created).
//filename defines the saved filename:
//uniqueSuffix uses timestamp + random number to avoid collisions.
//path.extname(file.originalname) preserves the original file extension (important for Cloudinary and other processors).
//The final filename looks like avatar-1623456789012-123456789.jpg.
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadPath)
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname)
        cb(null, file.fieldname + '-' + uniqueSuffix + ext)
    }
})

export const upload = multer({
    storage
})