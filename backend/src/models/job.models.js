import mongoose from "mongoose";
import { CONTRACT_STATUS } from "../utils/constants.js";
import querySchema from "./query.models.js";
import { Escrow } from "./escrow.models.js";

const jobSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, minlength: 5 },
    description: { type: String, required: true, minlength: 20 },
    budget: { type: Number, required: true, min: 10 },
    category: { type: String, required: true, trim: true },
    type: { type: String, enum: ["OPEN", "DIRECT"], required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedFreelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    bids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Bid" }],
    status: { 
        type: String,
        enum: [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.IN_PROGRESS, CONTRACT_STATUS.CANCELLED, CONTRACT_STATUS.COMPLETED, CONTRACT_STATUS.DISPUTED],
        default: CONTRACT_STATUS.ACTIVE 
    },
    queries: [{ type: mongoose.Schema.Types.ObjectId, ref: "Query" }],
    escrow: { type: mongoose.Schema.Types.ObjectId, ref: "Escrow" } // link to Escrow
}, { timestamps: true });

export const Job = mongoose.model("Job", jobSchema);
