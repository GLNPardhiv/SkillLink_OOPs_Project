import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  startConversation,
  getUserConversations,
  getMessages,
  sendMessage
} from "../controllers/messages.controllers.js";

const router = express.Router();
router.use(verifyJWT);

router.post("/start", startConversation);
router.get("/conversations", getUserConversations);
router.get("/:conversationId", getMessages);
router.post("/send", sendMessage);

export default router;
