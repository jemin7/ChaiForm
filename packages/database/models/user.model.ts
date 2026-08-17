import { randomUUID } from "node:crypto";
import mongoose, { type Model } from "mongoose";

/** AI credits granted to free users each day (UTC). */
export const AI_CREDITS_PER_DAY = 5;

export interface User {
  id: string;
  name: string;
  email: string;
  password: string | null;
  image: string | null;
  provider: string;
  plan: "free" | "pro";
  emailVerified: boolean;
  /** Bumped on password changes so older JWTs are rejected. */
  sessionVersion: number;
  /** Remaining AI credits for the current UTC day (free plan). */
  aiCredits: number;
  /** UTC day (YYYY-MM-DD) that `aiCredits` belongs to; credits reset when this changes. */
  aiCreditsDay: string | null;
  emailVerificationToken: string | null;
  emailVerificationTokenExpires: Date | null;
  passwordResetToken: string | null;
  passwordResetTokenExpires: Date | null;
  createdAt: Date;
}

/** Raw document shape (as returned by lean queries / toObject). */
export interface UserLean {
  _id: string;
  name: string;
  email: string;
  password: string | null;
  image: string | null;
  provider: string;
  plan: "free" | "pro";
  emailVerified: boolean;
  sessionVersion: number;
  aiCredits: number;
  aiCreditsDay: string | null;
  emailVerificationToken: string | null;
  emailVerificationTokenExpires: Date | null;
  passwordResetToken: string | null;
  passwordResetTokenExpires: Date | null;
  createdAt: Date;
}

const userSchema = new mongoose.Schema<UserLean>(
  {
    _id: { type: String, default: randomUUID },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, maxlength: 255 },
    password: { type: String, default: null },
    image: { type: String, default: null },
    provider: { type: String, default: "google", maxlength: 40 },
    plan: { type: String, enum: ["free", "pro"], default: "free" },
    emailVerified: { type: Boolean, default: false },
    sessionVersion: { type: Number, default: 0 },
    aiCredits: { type: Number, default: AI_CREDITS_PER_DAY, min: 0 },
    aiCreditsDay: { type: String, default: null, maxlength: 10 },
    emailVerificationToken: { type: String, default: null, maxlength: 64 },
    emailVerificationTokenExpires: { type: Date, default: null },
    passwordResetToken: { type: String, default: null, maxlength: 64 },
    passwordResetTokenExpires: { type: Date, default: null },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

export const UserModel =
  (mongoose.models.User as Model<UserLean> | undefined) ??
  mongoose.model<UserLean>("User", userSchema);

export function toUser(doc: UserLean): User {
  return {
    id: doc._id,
    name: doc.name,
    email: doc.email,
    password: doc.password,
    image: doc.image,
    provider: doc.provider,
    plan: doc.plan,
    emailVerified: doc.emailVerified,
    sessionVersion: doc.sessionVersion ?? 0,
    aiCredits: doc.aiCredits ?? AI_CREDITS_PER_DAY,
    aiCreditsDay: doc.aiCreditsDay ?? null,
    emailVerificationToken: doc.emailVerificationToken ?? null,
    emailVerificationTokenExpires: doc.emailVerificationTokenExpires ?? null,
    passwordResetToken: doc.passwordResetToken ?? null,
    passwordResetTokenExpires: doc.passwordResetTokenExpires ?? null,
    createdAt: doc.createdAt,
  };
}
