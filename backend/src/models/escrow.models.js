import mongoose from "mongoose";

const escrowSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  totalAmount: { type: Number, required: true },
  heldAmount: { type: Number, default: 0 },
  releasedAmount: { type: Number, default: 0 },
  refundedAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["awaiting_deposit", "funded", "on-hold", "partially_released", "released", "refunded", "disputed"],
    default: "awaiting_deposit"
  },
  releaseSchedule: [{
    milestoneId: String,
    amount: Number,
    scheduledDate: Date,
    releasedDate: Date,
    status: { type: String, enum: ["pending", "released", "cancelled"], default: "pending" }
  }],
  notes: String
}, { timestamps: true });

export const Escrow = mongoose.model("Escrow", escrowSchema);
