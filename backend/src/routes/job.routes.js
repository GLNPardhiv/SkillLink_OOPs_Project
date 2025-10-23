import express from "express";
import { postJob , searchJobs} from "../controllers/job.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// POST a new job

router.post("/", verifyJWT, postJob);
router.get("/search",searchJobs);
export default router;
