import { Escrow } from "../models/escrow.models.js";
import { Job } from "../models/job.models.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";

// 1️⃣ Client funds escrow
export const fundEscrow = asyncHandler(async (req, res) => {
  const { jobId, amount } = req.body;
  const job = await Job.findById(jobId);
  if (!job) throw new ApiError(404, "Job not found");

  if (job.client.toString() !== req.user._id.toString()) 
    throw new ApiError(403, "Not authorized");

  const escrow = await Escrow.create({
    job: job._id,
    client: job.client,
    freelancer: job.assignedFreelancer,
    totalAmount: amount,
    heldAmount: amount,
    status: "on-hold"
  });

  job.escrow = escrow._id;
  await job.save();

  res.status(201).json(new ApiResponse(201, escrow, "Escrow funded successfully"));
});

// 2️⃣ Admin releases escrow
export const releaseEscrow = asyncHandler(async (req, res) => {
  const { escrowId } = req.params;
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new ApiError(404, "Escrow not found");

  escrow.status = "released";
  escrow.releasedAmount = escrow.heldAmount;
  await escrow.save();

  res.status(200).json(new ApiResponse(200, escrow, "Escrow released"));
});

// 3️⃣ Client/Freelancer raises dispute
export const raiseDispute = asyncHandler(async (req, res) => {
  const { escrowId } = req.params;
  const { reason } = req.body;
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new ApiError(404, "Escrow not found");

  escrow.status = "disputed";
  escrow.dispute = { isDisputed: true, disputedAt: new Date(), resolution: reason };
  await escrow.save();

  res.status(200).json(new ApiResponse(200, escrow, "Dispute raised successfully"));
});

// 4️⃣ Admin refunds client
export const refundClient = asyncHandler(async (req, res) => {
  const { escrowId } = req.params;
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new ApiError(404, "Escrow not found");

  escrow.status = "refunded";
  escrow.refundedAmount = escrow.heldAmount;
  await escrow.save();

  res.status(200).json(new ApiResponse(200, escrow, "Payment refunded to client"));
});

// 5️⃣ Get escrow details
export const getEscrowDetails = asyncHandler(async (req, res) => {
  const { escrowId } = req.params;

  const escrow = await Escrow.findById(escrowId)
    .populate("client", "username email")
    .populate("freelancer", "username email")
    .populate("job", "title description budget status");

  if (!escrow) throw new ApiError(404, "Escrow not found");

  res.status(200).json(new ApiResponse(200, escrow, "Escrow details fetched"));
});
