import {
  handleApiError,
  jsonData,
  requireApiAdmin,
  requireApiUser,
} from "@/lib/api";
import { getAnalytics } from "@/lib/data/analytics";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const denied = requireApiAdmin(auth.user);
  if (denied) return denied;

  try {
    const analytics = await getAnalytics();
    return jsonData(analytics);
  } catch (error) {
    return handleApiError(error);
  }
}
