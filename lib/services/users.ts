import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Lead } from "@/lib/models/Lead";
import { User } from "@/lib/models/User";
import type { SessionUser, UserRole } from "@/lib/types";
import { ServiceError } from "@/lib/services/errors";

interface CreateUserInput {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  incentiveRate: number;
  incentiveEnabled: boolean;
}

interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  incentiveRate?: number;
  incentiveEnabled?: boolean;
}

function assertAdmin(user: SessionUser): void {
  if (user.role === "SALES_EXEC") {
    throw new ServiceError("You do not have permission to do that.", 403);
  }
}

function assertCanManageTarget(
  actor: SessionUser,
  targetRole: UserRole,
): void {
  if (targetRole === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
    throw new ServiceError("Only a super admin can manage that account.", 403);
  }

  if (actor.role === "ADMIN" && targetRole !== "SALES_EXEC") {
    throw new ServiceError("Admins can only manage sales reps.", 403);
  }
}

export async function createUser(
  actor: SessionUser,
  input: CreateUserInput,
): Promise<{ id: string }> {
  assertAdmin(actor);
  await connectToDatabase();

  if (actor.role === "ADMIN" && input.role !== "SALES_EXEC") {
    throw new ServiceError("Admins can only create sales reps.", 403);
  }

  const username = input.username.trim().toLowerCase();
  const existing = await User.findOne({ username })
    .select("_id")
    .lean<{ _id: Types.ObjectId }>();

  if (existing) {
    throw new ServiceError("This username is already taken.", 409);
  }

  const user = await User.create({
    name: input.name.trim(),
    username,
    password: input.password,
    role: input.role,
    isActive: true,
    incentiveRate: input.incentiveRate,
    // Only a super admin decides whether a rep earns incentives.
    incentiveEnabled:
      actor.role === "SUPER_ADMIN" ? input.incentiveEnabled : false,
  });

  return { id: user._id.toString() };
}

export async function updateUser(
  actor: SessionUser,
  userId: string,
  input: UpdateUserInput,
): Promise<void> {
  assertAdmin(actor);
  await connectToDatabase();

  if (!Types.ObjectId.isValid(userId)) {
    throw new ServiceError("Invalid user id.", 400);
  }

  const target = await User.findById(userId).select("role isActive name");

  if (!target) {
    throw new ServiceError("User not found.", 404);
  }

  assertCanManageTarget(actor, target.role);

  if (target._id.toString() === actor.id && input.isActive === false) {
    throw new ServiceError("You cannot deactivate your own account.", 400);
  }

  if (input.role && input.role !== target.role) {
    if (actor.role !== "SUPER_ADMIN") {
      throw new ServiceError("Only a super admin can change roles.", 403);
    }
    assertCanManageTarget(actor, input.role);
    target.role = input.role;
  }

  if (input.name !== undefined) {
    target.name = input.name.trim();
  }

  if (input.incentiveRate !== undefined || input.incentiveEnabled !== undefined) {
    if (actor.role !== "SUPER_ADMIN") {
      throw new ServiceError(
        "Only a super admin can change incentive settings.",
        403,
      );
    }
  }

  if (input.incentiveRate !== undefined) {
    target.incentiveRate = input.incentiveRate;
  }

  if (input.incentiveEnabled !== undefined) {
    target.incentiveEnabled = input.incentiveEnabled;
  }

  if (input.isActive !== undefined && input.isActive !== target.isActive) {
    target.isActive = input.isActive;

    if (!input.isActive) {
      await Lead.updateMany(
        { assignedTo: target._id },
        { $set: { assignedTo: null } },
      );
    }
  }

  await target.save();
}

export async function toggleUserActive(
  actor: SessionUser,
  userId: string,
): Promise<{ isActive: boolean }> {
  assertAdmin(actor);
  await connectToDatabase();

  if (!Types.ObjectId.isValid(userId)) {
    throw new ServiceError("Invalid user id.", 400);
  }

  const target = await User.findById(userId).select("role isActive");

  if (!target) {
    throw new ServiceError("User not found.", 404);
  }

  if (target._id.toString() === actor.id) {
    throw new ServiceError("You cannot deactivate your own account.", 400);
  }

  assertCanManageTarget(actor, target.role);

  target.isActive = !target.isActive;

  if (!target.isActive) {
    await Lead.updateMany(
      { assignedTo: target._id },
      { $set: { assignedTo: null } },
    );
  }

  await target.save();

  return { isActive: target.isActive };
}
