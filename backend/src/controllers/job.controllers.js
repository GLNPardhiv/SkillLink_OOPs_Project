import { Job } from "../models/job.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { UserRolesEnum, CONTRACT_STATUS } from "../utils/constants.js";

const postJob = asyncHandler(async (req, res) => {
  const { 
    title, 
    description, 
    budget, 
    category, 
    type,
    skills,
    deadline,
    assignedFreelancer
  } = req.body;

  if (!title || !description || !budget || !category || !type) {
    throw new ApiError(400, "All required fields must be filled");
  }

  if (!["OPEN", "DIRECT"].includes(type)) {
    throw new ApiError(400, "Invalid job type");
  }

  if (req.user.role !== UserRolesEnum.CLIENT) {
    throw new ApiError(403, "Only clients can post jobs");
  }

  // For DIRECT jobs, verify freelancer exists
  if (type === "DIRECT") {
    if (!assignedFreelancer) {
      throw new ApiError(400, "Direct jobs require a freelancer");
    }

    const freelancer = await User.findOne({
      _id: assignedFreelancer,
      role: UserRolesEnum.FREELANCER
    });

    if (!freelancer) throw new ApiError(404, "Freelancer not found");
  }

  const parsedDeadline = deadline ? new Date(deadline) : null;

  const job = await Job.create({
    title,
    description,
    budget,
    category,
    type,
    client: req.user._id,
    status: CONTRACT_STATUS.ACTIVE,
    query: null,
    skills: Array.isArray(skills) ? skills : [],
    deadline: parsedDeadline,
    assignedFreelancer: type === "DIRECT" ? assignedFreelancer : null
  });

  await job.populate("client", "name email avatar");
  if (type === "DIRECT" && assignedFreelancer) {
    await job.populate("assignedFreelancer", "name email avatar");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, job, "Job posted successfully"));
});

export { postJob };
