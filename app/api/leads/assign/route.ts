import {
  handleApiError,
  jsonData,
  jsonError,
  readJson,
  requireApiAdmin,
  requireApiUser,
} from "@/lib/api";
import { bulkAssignLeads } from "@/lib/services/leads";
import { bulkAssignSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const denied = requireApiAdmin(auth.user);
  if (denied) return denied;

  const body = await readJson(request);
  const parsed = bulkAssignSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid assignment.",
      422,
    );
  }

  try {
    const updated = await bulkAssignLeads(
      auth.user,
      parsed.data.leadIds,
      parsed.data.assignedTo,
    );
    return jsonData({ updated });
  } catch (error) {
    return handleApiError(error);
  }
}
