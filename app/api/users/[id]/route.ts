import {
  handleApiError,
  jsonData,
  jsonError,
  readJson,
  requireApiAdmin,
  requireApiUser,
} from "@/lib/api";
import { updateUser } from "@/lib/services/users";
import { updateUserSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/users/[id]">,
) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const denied = requireApiAdmin(auth.user);
  if (denied) return denied;

  const { id } = await context.params;
  const body = await readJson(request);
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid update.",
      422,
    );
  }

  try {
    await updateUser(auth.user, id, parsed.data);
    return jsonData({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
