import express from "express";
import {
    fundEscrow,
    releaseEscrow,
    raiseDispute,
    refundClient,
    getEscrowDetails
} from "../controllers/escrow.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Fund escrow (client)
router.post("/fund", verifyJWT, fundEscrow);

// Release escrow (admin)
router.put("/:escrowId/release", verifyJWT, releaseEscrow);

// Raise dispute (client or freelancer)
router.post("/:escrowId/dispute", verifyJWT, raiseDispute);

// Refund client (admin)
router.put("/:escrowId/refund", verifyJWT, refundClient);

// Get escrow details
router.get("/:escrowId", verifyJWT, getEscrowDetails);

export default router;
