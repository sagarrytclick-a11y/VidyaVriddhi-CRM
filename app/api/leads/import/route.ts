import { z } from "zod";
import {
  handleApiError,
  jsonData,
  jsonError,
  readJson,
  requireApiAdmin,
  requireApiUser,
} from "@/lib/api";
import { importLeads } from "@/lib/services/leads";

const importSchema = z.object({
  text: z.string().trim().min(1, "Paste lead text or CSV content."),
  autoAssign: z.boolean().default(false),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const denied = requireApiAdmin(auth.user);
  if (denied) return denied;

  const body = await readJson(request);
  const parsed = importSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid import.",
      422,
    );
  }

  try {
    const result = await importLeads(auth.user, parsed.data);
    return jsonData(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
