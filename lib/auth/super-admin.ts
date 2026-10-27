import { timingSafeEqual } from "node:crypto";
import { User, type UserDocument } from "@/lib/models/User";

/**
 * The super admin is configured in the environment, not created through the
 * UI. This keeps the owner able to sign in even on a brand-new (or freshly
 * reset) database: the first successful env login provisions the account.
 *
 * `SEED_ADMIN_*` is still read as a fallback for older deployments.
 */
export interface SuperAdminCredentials {
  username: string;
  password: string;
  name: string;
  email: string | null;
}

export function getSuperAdminCredentials(): SuperAdminCredentials | null {
  const username = (
    process.env.SUPER_ADMIN_USERNAME ??
    process.env.SEED_ADMIN_USERNAME ??
    ""
  )
    .trim()
    .toLowerCase();
  const password =
    process.env.SUPER_ADMIN_PASSWORD ??
    process.env.SEED_ADMIN_PASSWORD ??
    "";

  if (!username || password.length < 8) return null;

  const name = (
    process.env.SUPER_ADMIN_NAME ??
    process.env.SEED_ADMIN_NAME ??
    "Super Admin"
  ).trim();
  const email = (
    process.env.SUPER_ADMIN_EMAIL ??
    process.env.SEED_ADMIN_EMAIL ??
    ""
  )
    .trim()
    .toLowerCase();

  return {
    username,
    password,
    name: name || "Super Admin",
    email: email || null,
  };
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

export function isSuperAdminLogin(
  identifier: string,
  password: string,
): boolean {
  const credentials = getSuperAdminCredentials();

  if (!credentials) return false;

  const usernameMatches = safeEqual(
    identifier.trim().toLowerCase(),
    credentials.username,
  );
  const passwordMatches = safeEqual(password, credentials.password);

  return usernameMatches && passwordMatches;
}

/**
 * Returns the super admin account, creating or repairing it when needed.
 * The environment is the source of truth for the password, so changing
 * `SUPER_ADMIN_PASSWORD` and signing in rotates it automatically.
 */
export async function ensureSuperAdminUser(): Promise<UserDocument> {
  const credentials = getSuperAdminCredentials();

  if (!credentials) {
    throw new Error(
      "Set SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD in your environment.",
    );
  }

  const user = await User.findOne({ username: credentials.username }).select(
    "+password",
  );

  if (!user) {
    const created = await User.create({
      name: credentials.name,
      username: credentials.username,
      ...(credentials.email ? { email: credentials.email } : {}),
      password: credentials.password,
      role: "SUPER_ADMIN",
      isActive: true,
    });

    return created as UserDocument;
  }

  const document = user as unknown as UserDocument;
  let changed = false;

  if (document.role !== "SUPER_ADMIN") {
    document.role = "SUPER_ADMIN";
    changed = true;
  }

  if (!document.isActive) {
    document.isActive = true;
    changed = true;
  }

  if (document.name !== credentials.name) {
    document.name = credentials.name;
    changed = true;
  }

  if (credentials.email && document.email !== credentials.email) {
    document.email = credentials.email;
    changed = true;
  }

  if (!(await document.comparePassword(credentials.password))) {
    document.password = credentials.password;
    changed = true;
  }

  if (changed) {
    await document.save();
  }

  return document;
}
