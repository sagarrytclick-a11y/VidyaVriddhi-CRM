import { SignJWT, jwtVerify } from "jose";
import type { SessionUser, UserRole } from "@/lib/types";

interface SessionClaims {
  name: string;
  username: string;
  email: string | null;
  role: UserRole;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET is missing or too short. Use at least 32 random characters.",
    );
  }

  return new TextEncoder().encode(secret);
}

function isRole(value: unknown): value is UserRole {
  return (
    value === "SUPER_ADMIN" || value === "ADMIN" || value === "SALES_EXEC"
  );
}

export async function createSessionToken(
  user: SessionUser,
): Promise<string> {
  return new SignJWT({
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
  } satisfies SessionClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.username !== "string" ||
      (typeof payload.email !== "string" && payload.email !== null) ||
      !isRole(payload.role)
    ) {
      return null;
    }

    return {
      id: payload.sub,
      name: payload.name,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
