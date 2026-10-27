import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/models/User";
import type { SessionUser } from "@/lib/types";
import { verifySessionToken } from "@/lib/auth/jwt";

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;

  await connectToDatabase();

  const user = await User.findById(session.id)
    .select("name username email role isActive")
    .lean<{
      _id: unknown;
      name: string;
      username: string;
      email?: string | null;
      role: SessionUser["role"];
      isActive: boolean;
    }>();

  if (!user || !user.isActive) return null;

  return {
    id: String(user._id),
    name: user.name,
    username: user.username,
    email: user.email ?? null,
    role: user.role,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();

  if (user.role === "SALES_EXEC") {
    redirect("/dashboard");
  }

  return user;
}

export function canManageUsers(role: SessionUser["role"]): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canAssignLeads(role: SessionUser["role"]): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
