import { getCurrentUser } from "@/lib/auth/session";
import { jsonData, jsonError } from "@/lib/api";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Unauthorized.", 401);
  }

  return jsonData(user);
}
