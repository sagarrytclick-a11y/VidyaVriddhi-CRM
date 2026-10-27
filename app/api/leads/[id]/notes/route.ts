import {
  handleApiError,
  jsonData,
  jsonError,
  readJson,
  requireApiUser,
} from "@/lib/api";
import { addNote } from "@/lib/services/leads";
import { addNoteSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  context: RouteContext<"/api/leads/[id]/notes">,
) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const { id } = await context.params;
  const body = await readJson(request);
  const parsed = addNoteSchema.safeParse({
    ...(body && typeof body === "object" ? body : {}),
    leadId: id,
  });

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid note.",
      422,
    );
  }

  try {
    await addNote(auth.user, parsed.data.leadId, parsed.data.comment);
    return jsonData({ ok: true }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
