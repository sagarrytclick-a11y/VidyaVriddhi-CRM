import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ data: { ok: true } });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
