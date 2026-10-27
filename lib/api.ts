import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isDatabaseConnectionError } from "@/lib/db/connect";
import type { SessionUser } from "@/lib/types";
import { isServiceError } from "@/lib/services/errors";

const DATABASE_UNAVAILABLE_MESSAGE =
  "The database is unavailable. Start MongoDB (or run `npm run db`) and try again.";

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function jsonData<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

type ApiAuth =
  | { user: SessionUser; response: null }
  | { user: null; response: NextResponse };

export async function requireApiUser(): Promise<ApiAuth> {
  let user: SessionUser | null;

  try {
    user = await getCurrentUser();
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      console.error("API auth failed: database unavailable.", error);
      return {
        user: null,
        response: jsonError(DATABASE_UNAVAILABLE_MESSAGE, 503),
      };
    }

    throw error;
  }

  if (!user) {
    return { user: null, response: jsonError("Unauthorized.", 401) };
  }

  return { user, response: null };
}

export function requireApiAdmin(user: SessionUser): NextResponse | null {
  if (user.role === "SALES_EXEC") {
    return jsonError("You do not have permission to do that.", 403);
  }

  return null;
}

export function handleApiError(error: unknown): NextResponse {
  if (isServiceError(error)) {
    return jsonError(error.message, error.status);
  }

  if (isDatabaseConnectionError(error)) {
    console.error("API route failed: database unavailable.", error);
    return jsonError(DATABASE_UNAVAILABLE_MESSAGE, 503);
  }

  console.error("API route failed:", error);
  return jsonError("Unexpected server error.", 500);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
