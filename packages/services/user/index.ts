import { createHash, randomBytes } from "node:crypto";

import { compare, hash } from "bcryptjs";

import { toUser, UserModel, type User } from "@repo/database";

const PASSWORD_HASH_ROUNDS = 12;

/** Generate a random opaque token and return its SHA-256 hash for storage. */
export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export interface UpsertGoogleUserInput {
  name: string;
  email: string;
  image: string | null;
}

export interface CreateCredentialsUserInput {
  name: string;
  email: string;
  password: string;
}

export class UserService {
  public async findByEmail(email: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    return user ? toUser(user) : undefined;
  }

  public async findById(id: string): Promise<User | undefined> {
    const user = await UserModel.findById(id).lean();
    return user ? toUser(user) : undefined;
  }

  public async upsertGoogleUser(input: UpsertGoogleUserInput): Promise<User> {
    const email = input.email.toLowerCase();
    const existing = await UserModel.findOne({ email });

    if (!existing) {
      const created = await UserModel.create({
        name: input.name,
        email,
        image: input.image,
        provider: "google",
        emailVerified: true,
      });
      return toUser(created.toObject());
    }

    existing.name = input.name;
    existing.image = input.image;
    existing.emailVerified = true;
    // Preserve an existing email/password account: only mark it as
    // Google-based if it has no password hash.
    if (!existing.password) {
      existing.provider = "google";
    }

    await existing.save();

    return toUser(existing.toObject());
  }

  public async createCredentialsUser(input: CreateCredentialsUserInput): Promise<User> {
    const created = await UserModel.create({
      name: input.name,
      email: input.email.toLowerCase(),
      password: input.password,
      provider: "credentials",
      emailVerified: false,
    });
    return toUser(created.toObject());
  }

  public async updateProfile(userId: string, input: { name: string }): Promise<User> {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { name: input.name.trim() },
      { new: true },
    ).lean();

    if (!user) {
      throw new Error("Unable to update profile");
    }

    return toUser(user);
  }

  public async setPlan(userId: string, plan: "free" | "pro"): Promise<User> {
    const user = await UserModel.findByIdAndUpdate(userId, { plan }, { new: true }).lean();

    if (!user) {
      throw new Error("Unable to update plan");
    }

    return toUser(user);
  }

  public async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.findById(userId);

    if (!user?.password) {
      throw new Error("Password changes are only available for email and password accounts.");
    }

    const isValid = await compare(currentPassword, user.password);

    if (!isValid) {
      throw new Error("Current password is incorrect.");
    }

    const hashedPassword = await hash(newPassword, PASSWORD_HASH_ROUNDS);

    // Bump the session version so previously issued JWTs are rejected — a
    // stolen token should not survive a password change.
    await UserModel.updateOne(
      { _id: userId },
      { $set: { password: hashedPassword }, $inc: { sessionVersion: 1 } },
    );
  }

  public async setEmailVerificationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          emailVerificationToken: tokenHash,
          emailVerificationTokenExpires: expiresAt,
        },
      },
    );
  }

  public async verifyEmailWithToken(tokenHash: string): Promise<User | null> {
    const user = await UserModel.findOne({
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpires: { $gt: new Date() },
    }).lean();

    if (!user) {
      return null;
    }

    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpires: null,
        },
      },
    );

    return toUser(user);
  }

  public async setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          passwordResetToken: tokenHash,
          passwordResetTokenExpires: expiresAt,
        },
      },
    );
  }

  public async findByPasswordResetToken(tokenHash: string): Promise<User | null> {
    const user = await UserModel.findOne({
      passwordResetToken: tokenHash,
      passwordResetTokenExpires: { $gt: new Date() },
    }).lean();

    return user ? toUser(user) : null;
  }

  public async resetPassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await hash(newPassword, PASSWORD_HASH_ROUNDS);

    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetTokenExpires: null,
        },
        $inc: { sessionVersion: 1 },
      },
    );
  }
}

export const userService = new UserService();
