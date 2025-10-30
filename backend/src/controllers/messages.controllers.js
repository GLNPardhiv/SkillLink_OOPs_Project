import { Conversation } from "../models/conversations.models.js";
import { Message } from "../models/messages.models.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
// import ApiError from "../utils/api-error.js";

// Create or get conversation
export const startConversation = asyncHandler(async (req, res) => {
  const { receiverId, jobId, contractId } = req.body;
  const userId = req.user._id;

  let conversation = await Conversation.findOne({
    participants: { $all: [userId, receiverId] },
    ...(jobId && { job: jobId }),
    ...(contractId && { contract: contractId }),
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userId, receiverId],
      job: jobId || null,
      contract: contractId || null,
    });
  }

  return res.status(200).json(
    new ApiResponse(200, conversation, "Conversation ready")
  );
});

// Fetch all conversations of a user
export const getUserConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const conversations = await Conversation.find({ participants: userId })
    .populate("participants", "name email role")
    .populate("job", "title")
    .populate("contract", "status");
  
  return res.status(200).json(
    new ApiResponse(200, conversations, "Conversations fetched")
  );
});

// Fetch all messages from a conversation
export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const messages = await Message.find({ conversationId })
    .populate("sender", "name email role");
  
  return res.status(200).json(
    new ApiResponse(200, messages, "Messages fetched")
  );
});

// REST fallback for sending message
export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId, text, fileUrl } = req.body;
  const sender = req.user._id;

  const message = await Message.create({
    conversationId,
    sender,
    text,
    fileUrl,
  });

  return res.status(201).json(
    new ApiResponse(201, message, "Message sent")
  );
});
