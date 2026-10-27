import { z } from "zod";
import {
  handleApiError,
  jsonData,
  jsonError,
  readJson,
  requireApiAdmin,
  requireApiUser,
} from "@/lib/api";
import { getLeadForUser } from "@/lib/data/leads";
import {
  assignLead,
  deleteLead,
  setDealValue,
  setLeadFollowUpDate,
  updateLeadStatus,
} from "@/lib/services/leads";
import { leadStatusSchema, objectIdSchema } from "@/lib/validators";

const patchSchema = z
  .object({
    status: leadStatusSchema.optional(),
    followUpDate: z.string().trim().nullable().optional(),
    assignedTo: objectIdSchema.nullable().optional(),
    dealValue: z.coerce.number().positive().max(1_000_000_000).optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.followUpDate !== undefined ||
      value.assignedTo !== undefined ||
      value.dealValue !== undefined,
    "Provide at least one field to update.",
  );

export async function GET(
  _request: Request,
  context: RouteContext<"/api/leads/[id]">,
) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const { id } = await context.params;

  try {
    const lead = await getLeadForUser(id, auth.user);

    if (!lead) {
      return jsonError("Lead not found.", 404);
    }

    return jsonData(lead);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/leads/[id]">,
) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const { id } = await context.params;
  const body = await readJson(request);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid update.",
      422,
    );
  }

  if (parsed.data.assignedTo !== undefined) {
    const denied = requireApiAdmin(auth.user);
    if (denied) return denied;
  }

  if (parsed.data.dealValue !== undefined) {
    const denied = requireApiAdmin(auth.user);
    if (denied) return denied;
  }

  try {
    if (parsed.data.status) {
      await updateLeadStatus(auth.user, id, parsed.data.status);
    }

    if (parsed.data.followUpDate !== undefined) {
      await setLeadFollowUpDate(
        auth.user,
        id,
        parsed.data.followUpDate,
      );
    }

    if (parsed.data.assignedTo !== undefined) {
      await assignLead(auth.user, id, parsed.data.assignedTo);
    }

    if (parsed.data.dealValue !== undefined) {
      await setDealValue(auth.user, id, parsed.data.dealValue);
    }

    return jsonData({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/leads/[id]">,
) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const denied = requireApiAdmin(auth.user);
  if (denied) return denied;

  const { id } = await context.params;

  try {
    await deleteLead(auth.user, id);
    return jsonData({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
