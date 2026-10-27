"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase, isDatabaseConnectionError } from "@/lib/db/connect";
import { findUserForLogin } from "@/lib/auth/credentials";
import { createSessionToken } from "@/lib/auth/jwt";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/constants";
import { loginSchema } from "@/lib/validators";

export interface AuthFormState {
  error?: string;
}

export async function loginAction(
  _previousState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const identifier = String(
    formData.get("identifier") ?? formData.get("email") ?? "",
  );
  const parsed = loginSchema.safeParse({
    identifier,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Enter your username or email and password.",
    };
  }

  const loginIdentifier = parsed.data.identifier ?? parsed.data.email ?? "";

  let user;

  try {
    await connectToDatabase();
    user = await findUserForLogin(loginIdentifier);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return {
        error:
          "Cannot reach the database. Start it with `npm run db` (or check MONGODB_URI), then try again.",
      };
    }

    throw error;
  }

  if (!user || !user.isActive) {
    return { error: "Invalid username or password." };
  }

  const passwordMatches = await user.comparePassword(parsed.data.password);

  if (!passwordMatches) {
    return { error: "Invalid username or password." };
  }

  const token = await createSessionToken({
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email ?? null,
    role: user.role,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  const next = String(formData.get("next") ?? "");
  const destination = next.startsWith("/dashboard") ? next : "/dashboard";

  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
