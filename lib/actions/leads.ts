"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  addNote,
  assignAllLeads,
  assignLead,
  bulkAssignLeads,
  createLead,
  deleteLead,
  deletePayment,
  importLeads,
  logCall,
  recordPayment,
  setDealValue,
  setLeadFollowUpDate,
  updateLeadStatus,
} from "@/lib/services/leads";
import { errorMessage, isServiceError } from "@/lib/services/errors";
import type {
  ActionResult,
  ImportActionState,
  LeadStatus,
  SessionUser,
} from "@/lib/types";
import {
  addNoteSchema,
  assignAllSchema,
  assignLeadSchema,
  bulkAssignSchema,
  createLeadSchema,
  dealValueSchema,
  deletePaymentSchema,
  logCallSchema,
  objectIdSchema,
  leadStatusSchema,
  recordPaymentSchema,
} from "@/lib/validators";

async function currentUserOrThrow(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

function revalidateLeadViews(): void {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard/team");
}

function actionError(error: unknown): ActionResult {
  if (!isServiceError(error)) {
    console.error("Lead action failed:", error);
  }

  return { ok: false, error: errorMessage(error) };
}

export async function updateLeadStatusAction(
  leadId: string,
  status: LeadStatus,
): Promise<ActionResult> {
  try {
    const user = await currentUserOrThrow();
    const parsedLeadId = objectIdSchema.safeParse(leadId);
    const parsedStatus = leadStatusSchema.safeParse(status);

    if (!parsedLeadId.success || !parsedStatus.success) {
      return { ok: false, error: "Invalid lead update." };
    }

    await updateLeadStatus(user, parsedLeadId.data, parsedStatus.data);
    revalidateLeadViews();
    return { ok: true, message: "Status updated." };
  } catch (error) {
    return actionError(error);
  }
}

export async function setLeadFollowUpDateAction(
  leadId: string,
  followUpDate: string | null,
): Promise<ActionResult> {
  try {
    const user = await currentUserOrThrow();
    const parsedLeadId = objectIdSchema.safeParse(leadId);

    if (!parsedLeadId.success) {
      return { ok: false, error: "Invalid lead." };
    }

    await setLeadFollowUpDate(user, parsedLeadId.data, followUpDate);
    revalidateLeadViews();
    return { ok: true, message: "Follow-up updated." };
  } catch (error) {
    return actionError(error);
  }
}

export async function logCallAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await currentUserOrThrow();
    const parsed = logCallSchema.safeParse(input);

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid call details.",
      };
    }

    await logCall(user, parsed.data);
    revalidateLeadViews();
    return { ok: true, message: "Call logged." };
  } catch (error) {
    return actionError(error);
  }
}

export async function addNoteAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await currentUserOrThrow();
    const parsed = addNoteSchema.safeParse(input);

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid note.",
      };
    }

    await addNote(user, parsed.data.leadId, parsed.data.comment);
    revalidateLeadViews();
    return { ok: true, message: "Note added." };
  } catch (error) {
    return actionError(error);
  }
}

export async function recordPaymentAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await currentUserOrThrow();
    const parsed = recordPaymentSchema.safeParse(input);

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid payment details.",
      };
    }

    await recordPayment(user, parsed.data);
    revalidateLeadViews();
    revalidatePath("/dashboard/team");
    return {
      ok: true,
      message: `Payment of ₹${parsed.data.amount.toLocaleString("en-IN")} recorded.`,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function setDealValueAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await currentUserOrThrow();
    const parsed = dealValueSchema.safeParse(input);

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid deal amount.",
      };
    }

    await setDealValue(user, parsed.data.leadId, parsed.data.dealValue);
    revalidateLeadViews();
    revalidatePath("/dashboard/team");
    return { ok: true, message: "Total deal amount saved." };
  } catch (error) {
    return actionError(error);
  }
}

export async function deletePaymentAction(
  leadId: string,
  paymentId: string,
): Promise<ActionResult> {
  try {
    const user = await currentUserOrThrow();
    const parsed = deletePaymentSchema.safeParse({ leadId, paymentId });

    if (!parsed.success) {
      return { ok: false, error: "Invalid payment." };
    }

    await deletePayment(user, parsed.data.leadId, parsed.data.paymentId);
    revalidateLeadViews();
    revalidatePath("/dashboard/team");
    return { ok: true, message: "Payment removed." };
  } catch (error) {
    return actionError(error);
  }
}

export async function assignLeadAction(
  leadId: string,
  assignedTo: string | null,
): Promise<ActionResult> {
  try {
    const user = await currentUserOrThrow();
    const parsed = assignLeadSchema.safeParse({ leadId, assignedTo });

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid assignment.",
      };
    }

    await assignLead(user, parsed.data.leadId, parsed.data.assignedTo);
    revalidateLeadViews();
    return { ok: true, message: "Lead reassigned." };
  } catch (error) {
    return actionError(error);
  }
}

export async function bulkAssignLeadsAction(
  leadIds: string[],
  assignedTo: string | null,
): Promise<ActionResult> {
  try {
    const user = await currentUserOrThrow();
    const parsed = bulkAssignSchema.safeParse({ leadIds, assignedTo });

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid assignment.",
      };
    }

    const count = await bulkAssignLeads(
      user,
      parsed.data.leadIds,
      parsed.data.assignedTo,
    );

    revalidateLeadViews();
    return {
      ok: true,
      message: `${count} lead${count === 1 ? "" : "s"} updated.`,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function assignAllLeadsAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await currentUserOrThrow();
    const parsed = assignAllSchema.safeParse(input);

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid assignment.",
      };
    }

    if (parsed.data.mode === "single" && !parsed.data.repId) {
      return { ok: false, error: "Choose a sales representative." };
    }

    const result = await assignAllLeads(user, {
      mode: parsed.data.mode,
      repId: parsed.data.repId ?? null,
      filters: {
        q: parsed.data.q || undefined,
        status: parsed.data.status ?? undefined,
        assigned: parsed.data.assigned || undefined,
        category: parsed.data.category || undefined,
        payment: parsed.data.payment ?? undefined,
      },
    });

    revalidateLeadViews();

    if (result.assigned === 0) {
      return { ok: true, message: "No leads matched the current filters." };
    }

    return {
      ok: true,
      message:
        parsed.data.mode === "split"
          ? `${result.assigned} lead${result.assigned === 1 ? "" : "s"} split across ${result.reps} rep${result.reps === 1 ? "" : "s"}.`
          : `${result.assigned} lead${result.assigned === 1 ? "" : "s"} assigned.`,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function createLeadAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await currentUserOrThrow();
    const parsed = createLeadSchema.safeParse(input);

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid lead details.",
      };
    }

    await createLead(user, parsed.data);
    revalidateLeadViews();
    return { ok: true, message: "Lead created." };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteLeadAction(leadId: string): Promise<ActionResult> {
  try {
    const user = await currentUserOrThrow();
    const parsed = objectIdSchema.safeParse(leadId);

    if (!parsed.success) {
      return { ok: false, error: "Invalid lead." };
    }

    await deleteLead(user, parsed.data);
    revalidateLeadViews();
    return { ok: true, message: "Lead deleted." };
  } catch (error) {
    return actionError(error);
  }
}

export async function importLeadsAction(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  try {
    const user = await currentUserOrThrow();

    if (user.role === "SALES_EXEC") {
      return {
        status: "error",
        error: "Only admins can import leads.",
      };
    }

    const rawText = String(formData.get("rawText") ?? "").trim();
    const file = formData.get("file");
    const autoAssign = formData.get("autoAssign") === "on";

    let fileText = "";

    if (file instanceof File && file.size > 0) {
      if (file.size > 2 * 1024 * 1024) {
        return {
          status: "error",
          error: "The upload is too large. Keep it under 2 MB.",
        };
      }

      fileText = await file.text();

      if (fileText.startsWith("%PDF")) {
        return {
          status: "error",
          error:
            "Binary PDFs are not parsed. Open the PDF, copy its text, and paste it here.",
        };
      }
    }

    const text = [fileText, rawText].filter(Boolean).join("\n");

    if (!text) {
      return {
        status: "error",
        error: "Paste lead text or choose a CSV file first.",
      };
    }

    const result = await importLeads(user, { text, autoAssign });
    revalidateLeadViews();

    return {
      status: "success",
      imported: result.imported,
      skipped: result.skipped,
      unassigned: result.unassigned,
      message: `${result.imported} lead${result.imported === 1 ? "" : "s"} imported.`,
    };
  } catch (error) {
    if (!isServiceError(error)) {
      console.error("Lead import failed:", error);
    }

    return {
      status: "error",
      error: errorMessage(error),
    };
  }
}
