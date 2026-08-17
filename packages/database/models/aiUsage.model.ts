import { randomUUID } from "node:crypto";
import mongoose, { type Model } from "mongoose";

export interface AiUsageLog {
  id: string;
  userId: string;
  operation: "generateWithAI" | "summarizeResponses";
  /** Credits deducted for this request (0 for Pro users, who are unlimited). */
  credits: number;
  status: "success" | "insufficient_credits" | "failed";
  error: string | null;
  createdAt: Date;
}

/** Raw document shape (as returned by lean queries / toObject). */
export interface AiUsageLogLean {
  _id: string;
  userId: string;
  operation: string;
  credits: number;
  status: string;
  error: string | null;
  createdAt: Date;
}

const aiUsageLogSchema = new mongoose.Schema<AiUsageLogLean>(
  {
    _id: { type: String, default: randomUUID },
    userId: { type: String, required: true, index: true },
    operation: {
      type: String,
      required: true,
      enum: ["generateWithAI", "summarizeResponses"],
    },
    credits: { type: Number, required: true, default: 0, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ["success", "insufficient_credits", "failed"],
    },
    error: { type: String, default: null },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

export const AiUsageLogModel =
  (mongoose.models.AiUsageLog as Model<AiUsageLogLean> | undefined) ??
  mongoose.model<AiUsageLogLean>("AiUsageLog", aiUsageLogSchema);

export function toAiUsageLog(doc: AiUsageLogLean): AiUsageLog {
  return {
    id: doc._id,
    userId: doc.userId,
    operation: doc.operation as AiUsageLog["operation"],
    credits: doc.credits ?? 0,
    status: doc.status as AiUsageLog["status"],
    error: doc.error ?? null,
    createdAt: doc.createdAt,
  };
}
