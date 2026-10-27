import { User, type UserDocument } from "@/lib/models/User";

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
