import mongoose from "mongoose";
const { Schema } = mongoose;

const querySchema = new Schema({
  raisedBy: { type: String, enum: ["client", "freelancer"], required: true },
  type: { type: String, required: true },
  text: { type: String, default: "" },
  status: { type: String, enum: ["open", "resolved"], default: "open" }
}, { timestamps: true });

export const Query = mongoose.model("Query", querySchema);
export default querySchema;
