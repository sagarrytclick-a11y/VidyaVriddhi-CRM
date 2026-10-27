import {
  handleApiError,
  jsonData,
  jsonError,
  readJson,
  requireApiAdmin,
  requireApiUser,
} from "@/lib/api";
import { createLead } from "@/lib/services/leads";
import { listLeads } from "@/lib/data/leads";
import { createLeadSchema, leadFilterSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = leadFilterSchema.safeParse(params);

    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "Invalid filters.",
        422,
      );
    }

    const result = await listLeads(auth.user, {
      q: parsed.data.q,
      status: parsed.data.status,
      assigned: parsed.data.assigned,
      category: parsed.data.category,
      payment: parsed.data.payment,
      page: parsed.data.page,
      pageSize: parsed.data.limit,
    });

    return jsonData(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const denied = requireApiAdmin(auth.user);
  if (denied) return denied;

  try {
    const body = await readJson(request);
    const parsed = createLeadSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "Invalid lead.",
        422,
      );
    }

    const lead = await createLead(auth.user, parsed.data);
    return jsonData(lead, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
