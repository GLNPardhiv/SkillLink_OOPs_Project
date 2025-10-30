import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express();

//converts data to objects from json, url
app.use(express.json({ limit:"16kb" }));
app.use(express.urlencoded({extended: true, limit: "16kb"}));

//makes everything available in public folder directly via url 
app.use(express.static("public"));

//enables cookies
app.use(cookieParser());

//basic setup of cors
app.use(cors({
    origin : process.env.CORS_ORIGIN?.split(",") || "http://localhost:8080", //allows requests from specified urls
    credentials : true, //allows cookies, authorization headers etc
    methods : ["GET", "POST", "PUT", "PATCH", "DELETE", "DELETE", "OPTIONS"], //allows these req from frontend
    allowedHeaders: ["Content-Type", "Authorization"] //List of headers allowed in cross origin requests
}));

//importing healthCheck to test server
import healthCheckRouter from "./routes/healthcheck.routes.js";
//importing all routes to test 
import authRouter from "./routes/auth.routes.js";
//importing profile routes
import profileRoutes from "./routes/profile.routes.js"
//importing jobs posting routes
import jobRoutes from "./routes/job.routes.js"
//importing bid routes
import bidRoutes from "./routes/bid.routes.js";
//importing invitation routes
import invitationRoutes from "./routes/invitation.routes.js"
//importing message routes
import messageRoutes from "./routes/messages.routes.js";

//url for healthCheck
app.use("/api/v1/healthCheck", healthCheckRouter);

//url for remaining routes
app.use("/api/v1/auth", authRouter)

//url for profile
app.use("/api/v1/profile", profileRoutes)

//url for jobs
app.use("/api/v1/jobs", jobRoutes)

//url for bids
app.use("/api/v1/bids", bidRoutes)

//url for invitations
app.use("/api/v1/invitations", invitationRoutes)

//url for messages
app.use("/api/v1/messages", messageRoutes);

export default app

