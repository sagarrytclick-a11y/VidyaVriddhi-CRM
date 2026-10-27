import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { DEFAULT_INCENTIVE_RATE } from "@/lib/constants";
import { Lead } from "@/lib/models/Lead";
import { User } from "@/lib/models/User";
import type { SessionUser, UserOption, UserWithStats } from "@/lib/types";

interface LeanUser {
  _id: Types.ObjectId;
  name: string;
  username: string;
  email?: string | null;
  role: SessionUser["role"];
  isActive: boolean;
  incentiveRate: number;
  incentiveEnabled?: boolean;
  createdAt: Date;
}

interface AssignmentCount {
  _id: Types.ObjectId | null;
  count: number;
}

interface CallCount {
  _id: Types.ObjectId | null;
  count: number;
}

export async function listActiveSalesReps(): Promise<UserOption[]> {
  await connectToDatabase();

  const reps = await User.find({ role: "SALES_EXEC", isActive: true })
    .select("name username email role isActive incentiveRate incentiveEnabled")
    .sort({ name: 1 })
    .lean<LeanUser[]>();

  return reps.map((rep) => ({
    id: rep._id.toString(),
    name: rep.name,
    username: rep.username,
    email: rep.email ?? null,
    role: rep.role,
    isActive: rep.isActive,
    incentiveRate: rep.incentiveRate ?? DEFAULT_INCENTIVE_RATE,
    incentiveEnabled: rep.incentiveEnabled ?? true,
  }));
}

export async function listUsersWithStats(): Promise<UserWithStats[]> {
  await connectToDatabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [users, assignmentCounts, callCounts] = await Promise.all([
    User.find()
      .select(
        "name username email role isActive incentiveRate incentiveEnabled createdAt",
      )
      .sort({ role: 1, name: 1 })
      .lean<LeanUser[]>(),
    Lead.aggregate<AssignmentCount>([
      { $match: { assignedTo: { $ne: null } } },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
    ]),
    Lead.aggregate<CallCount>([
      { $unwind: "$callLogs" },
      { $match: { "callLogs.calledAt": { $gte: today } } },
      { $group: { _id: "$callLogs.calledBy", count: { $sum: 1 } } },
    ]),
  ]);

  const assignments = new Map(
    assignmentCounts.map((row) => [String(row._id), row.count]),
  );
  const calls = new Map(callCounts.map((row) => [String(row._id), row.count]));

  return users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email ?? null,
    role: user.role,
    isActive: user.isActive,
    incentiveRate: user.incentiveRate ?? DEFAULT_INCENTIVE_RATE,
    incentiveEnabled: user.incentiveEnabled ?? true,
    createdAt: new Date(user.createdAt).toISOString(),
    leadsAssigned: assignments.get(user._id.toString()) ?? 0,
    callsToday: calls.get(user._id.toString()) ?? 0,
  }));
}
