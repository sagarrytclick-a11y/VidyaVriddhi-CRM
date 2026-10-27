import { User, type UserDocument } from "@/lib/models/User";
import {
  ensureSuperAdminUser,
  isSuperAdminLogin,
} from "@/lib/auth/super-admin";

export function normalizeLoginIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Accounts sign in with their username. Email is accepted as a fallback so
 * accounts created before usernames existed keep working.
 */
export async function findUserForLogin(
  identifier: string,
): Promise<UserDocument | null> {
  const normalized = normalizeLoginIdentifier(identifier);

  if (!normalized) return null;

  const user = await User.findOne({
    $or: [{ username: normalized }, { email: normalized }],
  }).select("+password");

  // `select()` widens the document type and drops the schema methods in
  // Mongoose's typings; the methods still exist at runtime.
  return user as unknown as UserDocument | null;
}

export type LoginResult =
  | { ok: true; user: UserDocument }
  | { ok: false; reason: "invalid" };

/**
 * Resolves a username/password pair to an active account.
 *
 * The super admin credentials come from the environment and always win, so
 * the owner can sign in even when the database is new or was reset. Everyone
 * else (sales reps) is checked against the database as usual.
 */
export async function authenticateUser(
  identifier: string,
  password: string,
): Promise<LoginResult> {
  if (isSuperAdminLogin(identifier, password)) {
    const user = await ensureSuperAdminUser();
    return { ok: true, user };
  }

  const user = await findUserForLogin(identifier);

  if (!user || !user.isActive) {
    return { ok: false, reason: "invalid" };
  }

  const passwordMatches = await user.comparePassword(password);

  if (!passwordMatches) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, user };
}
