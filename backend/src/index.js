import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./db/index.js";
import { Message } from "./models/messages.models.js";

dotenv.config({ path: "./.env" });

const port = process.env.PORT || 3000;

// Connect to MongoDB first
connectDB()
  .then(() => {
    // Create HTTP server
    const server = http.createServer(app);

    // Setup Socket.io
    const io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:8080",
        methods: ["GET", "POST"],
      },
    });

    // 🔌 Socket events
    io.on("connection", (socket) => {
      console.log("✅ New user connected:", socket.id);

      // Join chat room (conversation)
      socket.on("joinRoom", (conversationId) => {
        socket.join(conversationId);
        console.log(`User joined room: ${conversationId}`);
      });

      // Send message event
      socket.on("sendMessage", async (data) => {
        try {
          const { conversationId, sender, text, fileUrl } = data;

          // Save message to DB
          const message = await Message.create({
            conversationId,
            sender,
            text,
            fileUrl,
          });

          // Emit message to all users in that conversation
          io.to(conversationId).emit("newMessage", message);
        } catch (error) {
          console.error("Error saving message:", error);
        }
      });

      socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
      });
    });

    // Start both HTTP + Socket server
    server.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log("../backend/src/index.js");
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    console.log("../backend/src/index.js");
    process.exit(1);
  });
