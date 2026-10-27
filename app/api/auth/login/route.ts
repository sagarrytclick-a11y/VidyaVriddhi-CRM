import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticateUser } from "@/lib/auth/credentials";
import { createSessionToken } from "@/lib/auth/jwt";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/constants";
import { loginSchema } from "@/lib/validators";
import { jsonError, readJson } from "@/lib/api";

export async function POST(request: Request): Promise<NextResponse> {
  const body = await readJson(request);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ??
        "Enter your username or email and password.",
      422,
    );
  }

  await connectToDatabase();

  const result = await authenticateUser(
    parsed.data.identifier ?? parsed.data.email ?? "",
    parsed.data.password,
  );

  if (!result.ok) {
    return jsonError("Invalid username or password.", 401);
  }

  const { user } = result;

  const token = await createSessionToken({
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email ?? null,
    role: user.role,
  });

  const response = NextResponse.json({
    data: {
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email ?? null,
      role: user.role,
    },
  });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
