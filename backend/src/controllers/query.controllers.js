import { Job } from "../models/job.models.js";
import { Query } from "../models/query.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { UserRolesEnum } from "../utils/constants.js";

/**
 * @desc Raise a new query (by client or freelancer)
 */
export const raiseQuery = asyncHandler(async (req, res) => {
  const { jobId, type, text } = req.body;

  if (!jobId || !type) {
    throw new ApiError(400, "Job ID and type are required");
  }

  const job = await Job.findById(jobId);
  if (!job) throw new ApiError(404, "Job not found");

  const raisedBy =
    req.user.role === UserRolesEnum.CLIENT ? "client" : "freelancer";

  const query = await Query.create({
    raisedBy,
    type,
    text,
  });

  // Link this query to the job
  job.queries.push(query._id);
  await job.save();

  return res.status(201).json(
    new ApiResponse(201, query, "Query raised successfully")
  );
});

/**
 * @desc Get all queries for a specific job
 */
export const getJobQueries = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await Job.findById(jobId).populate("queries");
  if (!job) throw new ApiError(404, "Job not found");

  return res.status(200).json(
    new ApiResponse(200, job.queries, "Job queries fetched successfully")
  );
});

/**
 * @desc Resolve a query (admin or job owner)
 */
export const resolveQuery = asyncHandler(async (req, res) => {
  const { queryId } = req.params;

  const query = await Query.findById(queryId);
  if (!query) throw new ApiError(404, "Query not found");

  query.status = "resolved";
  await query.save();

  return res.status(200).json(
    new ApiResponse(200, query, "Query resolved successfully")
  );
});
