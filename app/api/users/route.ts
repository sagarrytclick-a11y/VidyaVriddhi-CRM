import {
  handleApiError,
  jsonData,
  jsonError,
  readJson,
  requireApiAdmin,
  requireApiUser,
} from "@/lib/api";
import { listUsersWithStats } from "@/lib/data/users";
import { createUser } from "@/lib/services/users";
import { createUserSchema } from "@/lib/validators";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const denied = requireApiAdmin(auth.user);
  if (denied) return denied;

  try {
    const users = await listUsersWithStats();
    return jsonData(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const denied = requireApiAdmin(auth.user);
  if (denied) return denied;

  const body = await readJson(request);
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid user.",
      422,
    );
  }

  try {
    const user = await createUser(auth.user, parsed.data);
    return jsonData(user, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
