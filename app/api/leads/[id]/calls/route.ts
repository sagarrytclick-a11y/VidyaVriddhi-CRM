import {
  handleApiError,
  jsonData,
  jsonError,
  readJson,
  requireApiUser,
} from "@/lib/api";
import { logCall } from "@/lib/services/leads";
import { logCallSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  context: RouteContext<"/api/leads/[id]/calls">,
) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const { id } = await context.params;
  const body = await readJson(request);
  const parsed = logCallSchema.safeParse({
    ...(body && typeof body === "object" ? body : {}),
    leadId: id,
  });

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid call.",
      422,
    );
  }

  try {
    await logCall(auth.user, parsed.data);
    return jsonData({ ok: true }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
