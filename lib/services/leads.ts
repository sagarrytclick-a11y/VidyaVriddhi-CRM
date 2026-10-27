import { Types, type QueryFilter } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Lead, type ILead, type LeadDocument } from "@/lib/models/Lead";
import { User } from "@/lib/models/User";
import { parseLeadText } from "@/lib/csv";
import {
  MAX_IMPORT_ROWS,
  PAYMENT_ELIGIBLE_STATUSES,
  normalizeLeadSource,
} from "@/lib/constants";
import type { LeadStatus, PaymentMode, PaymentStatus, SessionUser } from "@/lib/types";
import {
  normalizePhoneNumber,
  parseDateInput,
  roundCurrency,
  startOfDay,
} from "@/lib/utils";
import { ServiceError } from "@/lib/services/errors";
import { buildLeadFilter } from "@/lib/data/leads";

interface LogCallInput {
  leadId: string;
  status: LeadStatus;
  resultStatus: string;
  followUpDate?: string | null;
  note?: string | null;
}

interface ImportLeadInput {
  text: string;
  autoAssign: boolean;
}

interface ImportLeadResult {
  imported: number;
  skipped: number;
  unassigned: number;
}

interface RecordPaymentInput {
  leadId: string;
  amount: number;
  paidAt?: string | null;
  mode: PaymentMode;
  reference?: string | null;
  note?: string | null;
}

function assertObjectId(value: string, label = "record"): void {
  if (!Types.ObjectId.isValid(value)) {
    throw new ServiceError(`Invalid ${label} id.`, 400);
  }
}

function assertAdmin(user: SessionUser): void {
  if (user.role === "SALES_EXEC") {
    throw new ServiceError("You do not have permission to do that.", 403);
  }
}

/**
 * Move a lead to a new stage and record who did it. "call" means the change
 * came from the call logger; "manual" means the status dropdown was used
 * without logging a call. Admins can use this to spot stage changes that
 * have no call activity behind them.
 */
function moveLeadToStatus(
  lead: LeadDocument,
  user: SessionUser,
  to: LeadStatus,
  source: "manual" | "call",
): void {
  if (lead.status === to) return;

  lead.statusHistory.push({
    from: lead.status,
    to,
    changedBy: new Types.ObjectId(user.id),
    changedAt: new Date(),
    source,
  });
  lead.status = to;
}

async function findLeadForUser(
  leadId: string,
  user: SessionUser,
): Promise<LeadDocument> {
  assertObjectId(leadId, "lead");

  const query: QueryFilter<ILead> = { _id: new Types.ObjectId(leadId) };

  if (user.role === "SALES_EXEC") {
    query.assignedTo = new Types.ObjectId(user.id);
  }

  const lead = await Lead.findOne(query);

  if (!lead) {
    throw new ServiceError("Lead not found or not assigned to you.", 404);
  }

  return lead;
}

async function assertAssignableRep(repId: string): Promise<Types.ObjectId> {
  assertObjectId(repId, "sales rep");

  const rep = await User.findOne({
    _id: new Types.ObjectId(repId),
    role: "SALES_EXEC",
    isActive: true,
  })
    .select("_id")
    .lean<{ _id: Types.ObjectId }>();

  if (!rep) {
    throw new ServiceError("Choose an active sales representative.", 400);
  }

  return rep._id;
}

export async function createLead(
  user: SessionUser,
  input: {
    businessName: string;
    phoneNumber: string;
    cityState?: string | null;
    category?: string | null;
    source?: string | null;
    assignedTo?: string | null;
  },
) {
  assertAdmin(user);
  await connectToDatabase();

  const phoneNumber = normalizePhoneNumber(input.phoneNumber);

  if (phoneNumber.length < 10) {
    throw new ServiceError("Enter a valid phone number.", 400);
  }

  const duplicate = await Lead.findOne({ phoneNumber })
    .select("_id")
    .lean<{ _id: Types.ObjectId }>();

  if (duplicate) {
    throw new ServiceError("A lead with this phone number already exists.", 409);
  }

  const assignedTo = input.assignedTo
    ? await assertAssignableRep(input.assignedTo)
    : null;

  const lead = await Lead.create({
    businessName: input.businessName.trim(),
    phoneNumber,
    cityState: input.cityState?.trim() || null,
    category: input.category?.trim() || null,
    source: normalizeLeadSource(input.source) ?? "Other",
    assignedTo,
    status: "NEW",
  });

  return { id: lead._id.toString() };
}

export async function updateLeadStatus(
  user: SessionUser,
  leadId: string,
  status: LeadStatus,
): Promise<void> {
  await connectToDatabase();
  const lead = await findLeadForUser(leadId, user);

  moveLeadToStatus(lead, user, status, "manual");
  if (status !== "FOLLOW_UP") {
    lead.followUpDate = null;
  }

  await lead.save();
}

export async function setLeadFollowUpDate(
  user: SessionUser,
  leadId: string,
  followUpDate: string | null,
): Promise<void> {
  await connectToDatabase();
  const lead = await findLeadForUser(leadId, user);
  const parsed = parseDateInput(followUpDate);

  if (followUpDate && !parsed) {
    throw new ServiceError("Enter a valid follow-up date.", 400);
  }

  lead.followUpDate = parsed;
  if (parsed) {
    moveLeadToStatus(lead, user, "FOLLOW_UP", "manual");
  }
  await lead.save();
}

export async function logCall(
  user: SessionUser,
  input: LogCallInput,
): Promise<void> {
  await connectToDatabase();
  const lead = await findLeadForUser(input.leadId, user);
  const parsedFollowUp = parseDateInput(input.followUpDate);

  if (input.status === "FOLLOW_UP" && !parsedFollowUp) {
    throw new ServiceError("Choose a follow-up date.", 400);
  }

  lead.callLogs.push({
    calledBy: new Types.ObjectId(user.id),
    calledAt: new Date(),
    resultStatus: input.resultStatus.trim(),
  });

  moveLeadToStatus(lead, user, input.status, "call");
  lead.followUpDate =
    input.status === "FOLLOW_UP" ? parsedFollowUp : null;

  if (input.note?.trim()) {
    lead.notes.push({
      comment: input.note.trim(),
      createdBy: new Types.ObjectId(user.id),
      createdAt: new Date(),
    });
  }

  await lead.save();
}

function assertPaymentStage(status: LeadStatus): void {
  if (
    !(PAYMENT_ELIGIBLE_STATUSES as readonly LeadStatus[]).includes(status)
  ) {
    throw new ServiceError(
      "Payments can be recorded after the developer meeting. Move this lead to Meeting, Proposal, or Converted first.",
      400,
    );
  }
}

function amountReceived(lead: LeadDocument): number {
  return roundCurrency(
    (lead.payments ?? []).reduce(
      (total, payment) => total + payment.amount,
      0,
    ),
  );
}

/**
 * Record a full or partial payment against a deal. The rep who owns the lead
 * at this moment is credited for incentives, even if an admin records the
 * payment on their behalf.
 */
export async function recordPayment(
  user: SessionUser,
  input: RecordPaymentInput,
): Promise<{ id: string }> {
  await connectToDatabase();
  const lead = await findLeadForUser(input.leadId, user);

  assertPaymentStage(lead.status);

  if (!lead.dealValue || lead.dealValue <= 0) {
    throw new ServiceError(
      "Set the total deal amount before recording a payment.",
      400,
    );
  }

  const amount = roundCurrency(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ServiceError("Enter a payment amount greater than zero.", 400);
  }

  const paid = amountReceived(lead);
  const due = roundCurrency(lead.dealValue - paid);

  if (due <= 0) {
    throw new ServiceError("This deal is already fully paid.", 409);
  }

  if (amount > due) {
    throw new ServiceError(
      `Payment cannot exceed the remaining amount of ₹${due.toLocaleString("en-IN")}.`,
      400,
    );
  }

  const paidAt = input.paidAt ? parseDateInput(input.paidAt) : new Date();

  if (!paidAt) {
    throw new ServiceError("Enter a valid payment date.", 400);
  }

  if (startOfDay(paidAt) > startOfDay()) {
    throw new ServiceError("Payment date cannot be in the future.", 400);
  }

  lead.payments.push({
    amount,
    paidAt,
    mode: input.mode,
    reference: input.reference?.trim() || null,
    note: input.note?.trim() || null,
    repId: lead.assignedTo ?? null,
    recordedBy: new Types.ObjectId(user.id),
    createdAt: new Date(),
  });

  await lead.save();

  const created = lead.payments[lead.payments.length - 1];

  return { id: created?._id?.toString() ?? "" };
}

/** Admins own the deal value so reps cannot inflate their own incentives. */
export async function setDealValue(
  user: SessionUser,
  leadId: string,
  dealValue: number,
): Promise<void> {
  assertAdmin(user);
  await connectToDatabase();
  assertObjectId(leadId, "lead");

  const lead = await Lead.findById(leadId);

  if (!lead) {
    throw new ServiceError("Lead not found.", 404);
  }

  assertPaymentStage(lead.status);

  const value = roundCurrency(dealValue);

  if (!Number.isFinite(value) || value <= 0) {
    throw new ServiceError("Enter a total deal amount greater than zero.", 400);
  }

  const paid = amountReceived(lead);

  if (value < paid) {
    throw new ServiceError(
      `Total amount cannot be less than the ₹${paid.toLocaleString("en-IN")} already received.`,
      400,
    );
  }

  lead.dealValue = value;
  await lead.save();
}

export async function deletePayment(
  user: SessionUser,
  leadId: string,
  paymentId: string,
): Promise<void> {
  assertAdmin(user);
  await connectToDatabase();
  assertObjectId(leadId, "lead");
  assertObjectId(paymentId, "payment");

  const lead = await Lead.findById(leadId);

  if (!lead) {
    throw new ServiceError("Lead not found.", 404);
  }

  const index = (lead.payments ?? []).findIndex(
    (payment) => String(payment._id) === paymentId,
  );

  if (index < 0) {
    throw new ServiceError("Payment not found.", 404);
  }

  lead.payments.splice(index, 1);
  await lead.save();
}

export async function addNote(
  user: SessionUser,
  leadId: string,
  comment: string,
): Promise<void> {
  await connectToDatabase();
  const lead = await findLeadForUser(leadId, user);

  lead.notes.push({
    comment: comment.trim(),
    createdBy: new Types.ObjectId(user.id),
    createdAt: new Date(),
  });

  await lead.save();
}

export async function assignLead(
  user: SessionUser,
  leadId: string,
  assignedTo: string | null,
): Promise<void> {
  assertAdmin(user);
  await connectToDatabase();
  assertObjectId(leadId, "lead");

  const repId = assignedTo ? await assertAssignableRep(assignedTo) : null;

  const result = await Lead.updateOne(
    { _id: new Types.ObjectId(leadId) },
    { $set: { assignedTo: repId } },
  );

  if (result.matchedCount === 0) {
    throw new ServiceError("Lead not found.", 404);
  }
}

export async function bulkAssignLeads(
  user: SessionUser,
  leadIds: string[],
  assignedTo: string | null,
): Promise<number> {
  assertAdmin(user);
  await connectToDatabase();

  const ids = leadIds.map((id) => {
    assertObjectId(id, "lead");
    return new Types.ObjectId(id);
  });

  const repId = assignedTo ? await assertAssignableRep(assignedTo) : null;

  const result = await Lead.updateMany(
    { _id: { $in: ids } },
    { $set: { assignedTo: repId } },
  );

  return result.modifiedCount;
}

interface AssignAllInput {
  mode: "single" | "split";
  repId?: string | null;
  filters: {
    q?: string;
    status?: LeadStatus;
    assigned?: string;
    category?: string;
    source?: string;
    payment?: PaymentStatus;
  };
}

export interface AssignAllResult {
  assigned: number;
  reps: number;
}

/**
 * Assign every lead matching the current list filters, without page or
 * count limits. "single" gives everything to one rep; "split" distributes
 * leads across all active reps, weighted toward the lightest workload.
 */
export async function assignAllLeads(
  user: SessionUser,
  input: AssignAllInput,
): Promise<AssignAllResult> {
  assertAdmin(user);
  await connectToDatabase();

  // Reuse the exact filter the leads page renders with, so "all matching"
  // always agrees with what the admin sees on screen.
  const query = buildLeadFilter(user, input.filters);

  if (input.mode === "single") {
    if (!input.repId) {
      throw new ServiceError("Choose a sales representative.", 400);
    }

    const repId = await assertAssignableRep(input.repId);
    const result = await Lead.updateMany(query, {
      $set: { assignedTo: repId },
    });

    return { assigned: result.modifiedCount, reps: 1 };
  }

  const reps = await User.find({ role: "SALES_EXEC", isActive: true })
    .select("_id")
    .sort({ name: 1 })
    .lean<{ _id: Types.ObjectId }[]>();

  if (reps.length === 0) {
    throw new ServiceError(
      "There are no active sales reps to assign leads to.",
      400,
    );
  }

  const matching = await Lead.find(query)
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>();

  if (matching.length === 0) {
    return { assigned: 0, reps: reps.length };
  }

  // Same least-loaded-bucket distribution as the import auto-assign.
  const counts = await Lead.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { assignedTo: { $in: reps.map((rep) => rep._id) } } },
    { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((row) => [String(row._id), row.count]));
  const buckets = reps.map((rep) => ({
    id: rep._id,
    count: countMap.get(String(rep._id)) ?? 0,
    ids: [] as Types.ObjectId[],
  }));

  for (const doc of matching) {
    let best = buckets[0];
    for (const bucket of buckets) {
      if (bucket.count < best.count) best = bucket;
    }
    best.ids.push(doc._id);
    best.count += 1;
  }

  let assigned = 0;

  for (const bucket of buckets) {
    if (bucket.ids.length === 0) continue;

    const result = await Lead.updateMany(
      { _id: { $in: bucket.ids } },
      { $set: { assignedTo: bucket.id } },
    );
    assigned += result.modifiedCount;
  }

  return { assigned, reps: buckets.length };
}

export async function importLeads(
  user: SessionUser,
  input: ImportLeadInput,
): Promise<ImportLeadResult> {
  assertAdmin(user);
  await connectToDatabase();

  const parsed = parseLeadText(input.text);

  if (parsed.rows.length === 0) {
    throw new ServiceError(
      "No valid leads found. Include a business name and phone number per row.",
      400,
    );
  }

  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    throw new ServiceError(
      `Import at most ${MAX_IMPORT_ROWS.toLocaleString()} leads at a time.`,
      400,
    );
  }

  const uniqueRows = new Map<string, (typeof parsed.rows)[number]>();
  for (const row of parsed.rows) {
    if (!uniqueRows.has(row.phoneNumber)) {
      uniqueRows.set(row.phoneNumber, row);
    }
  }

  const phones = Array.from(uniqueRows.keys());
  const existing = await Lead.find({ phoneNumber: { $in: phones } })
    .select("phoneNumber")
    .lean<{ phoneNumber: string }[]>();
  const existingPhones = new Set(existing.map((lead) => lead.phoneNumber));

  const rowsToInsert = phones
    .filter((phone) => !existingPhones.has(phone))
    .map((phone) => uniqueRows.get(phone))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const skipped =
    parsed.skipped +
    (parsed.rows.length - uniqueRows.size) +
    existingPhones.size;

  if (rowsToInsert.length === 0) {
    throw new ServiceError(
      `No new leads to import. ${skipped} duplicate or invalid row(s) skipped.`,
      409,
    );
  }

  const assignment = new Map<string, Types.ObjectId>();

  if (input.autoAssign) {
    const reps = await User.find({ role: "SALES_EXEC", isActive: true })
      .select("_id")
      .sort({ name: 1 })
      .lean<{ _id: Types.ObjectId }[]>();

    if (reps.length === 0) {
      throw new ServiceError(
        "There are no active sales reps to auto-assign leads to.",
        400,
      );
    }

    const counts = await Lead.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { assignedTo: { $in: reps.map((rep) => rep._id) } } },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(counts.map((row) => [String(row._id), row.count]));
    const buckets = reps.map((rep) => ({
      id: rep._id,
      count: countMap.get(String(rep._id)) ?? 0,
    }));

    for (const row of rowsToInsert) {
      let best = buckets[0];
      for (const bucket of buckets) {
        if (bucket.count < best.count) best = bucket;
      }
      best.count += 1;
      assignment.set(row.phoneNumber, best.id);
    }
  }

  const now = new Date();

  await Lead.insertMany(
    rowsToInsert.map((row) => ({
      businessName: row.businessName,
      phoneNumber: row.phoneNumber,
      cityState: row.cityState ?? null,
      category: row.category ?? null,
      source: row.source ?? "Other",
      status: "NEW",
      assignedTo: assignment.get(row.phoneNumber) ?? null,
      followUpDate: null,
      notes: [],
      callLogs: [],
      createdAt: now,
      updatedAt: now,
    })),
    { ordered: false },
  );

  return {
    imported: rowsToInsert.length,
    skipped,
    unassigned: rowsToInsert.length - assignment.size,
  };
}

export interface IntakeLeadInput {
  businessName: string;
  phoneNumber: string;
  cityState?: string | null;
  category?: string | null;
  source?: string | null;
}

export interface IntakeLeadResult {
  created: { id: string; businessName: string; phoneNumber: string }[];
  skipped: { phoneNumber: string; reason: "duplicate" | "invalid" }[];
}

/**
 * Lead intake for external websites (API key auth, no session). Unlike the
 * admin import it is forgiving: unknown sources become "Other" and duplicate
 * phone numbers are reported instead of failing the whole batch.
 */
export async function intakeLeads(input: {
  leads: IntakeLeadInput[];
  autoAssign: boolean;
}): Promise<IntakeLeadResult> {
  await connectToDatabase();

  const skipped: IntakeLeadResult["skipped"] = [];
  const seen = new Set<string>();
  const rows: {
    businessName: string;
    phoneNumber: string;
    cityState: string | null;
    category: string | null;
    source: string;
  }[] = [];

  for (const lead of input.leads) {
    const phoneNumber = normalizePhoneNumber(lead.phoneNumber);

    if (phoneNumber.length < 10) {
      skipped.push({ phoneNumber: lead.phoneNumber, reason: "invalid" });
      continue;
    }

    if (seen.has(phoneNumber)) {
      skipped.push({ phoneNumber, reason: "duplicate" });
      continue;
    }

    seen.add(phoneNumber);
    rows.push({
      businessName: lead.businessName.trim(),
      phoneNumber,
      cityState: lead.cityState?.trim() || null,
      category: lead.category?.trim() || null,
      source: normalizeLeadSource(lead.source) ?? "Other",
    });
  }

  if (rows.length === 0) {
    return { created: [], skipped };
  }

  const existing = await Lead.find({
    phoneNumber: { $in: rows.map((row) => row.phoneNumber) },
  })
    .select("phoneNumber")
    .lean<{ phoneNumber: string }[]>();

  const existingPhones = new Set(existing.map((row) => row.phoneNumber));
  const fresh = rows.filter((row) => {
    if (!existingPhones.has(row.phoneNumber)) return true;
    skipped.push({ phoneNumber: row.phoneNumber, reason: "duplicate" });
    return false;
  });

  if (fresh.length === 0) {
    return { created: [], skipped };
  }

  const assignment = new Map<string, Types.ObjectId>();

  if (input.autoAssign) {
    const reps = await User.find({ role: "SALES_EXEC", isActive: true })
      .select("_id")
      .sort({ name: 1 })
      .lean<{ _id: Types.ObjectId }[]>();

    if (reps.length > 0) {
      const counts = await Lead.aggregate<
        { _id: Types.ObjectId; count: number }
      >([
        { $match: { assignedTo: { $in: reps.map((rep) => rep._id) } } },
        { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
      ]);

      const countMap = new Map(
        counts.map((row) => [String(row._id), row.count]),
      );
      const buckets = reps.map((rep) => ({
        id: rep._id,
        count: countMap.get(String(rep._id)) ?? 0,
      }));

      for (const row of fresh) {
        let best = buckets[0];
        for (const bucket of buckets) {
          if (bucket.count < best.count) best = bucket;
        }
        best.count += 1;
        assignment.set(row.phoneNumber, best.id);
      }
    }
  }

  const now = new Date();
  const documents = await Lead.insertMany(
    fresh.map((row) => ({
      businessName: row.businessName,
      phoneNumber: row.phoneNumber,
      cityState: row.cityState,
      category: row.category,
      source: row.source,
      status: "NEW",
      assignedTo: assignment.get(row.phoneNumber) ?? null,
      followUpDate: null,
      notes: [],
      callLogs: [],
      createdAt: now,
      updatedAt: now,
    })),
    { ordered: false },
  );

  return {
    created: documents.map((document) => ({
      id: document._id.toString(),
      businessName: document.businessName,
      phoneNumber: document.phoneNumber,
    })),
    skipped,
  };
}

export async function deleteLead(
  user: SessionUser,
  leadId: string,
): Promise<void> {
  assertAdmin(user);
  await connectToDatabase();
  assertObjectId(leadId, "lead");

  const result = await Lead.deleteOne({ _id: new Types.ObjectId(leadId) });

  if (result.deletedCount === 0) {
    throw new ServiceError("Lead not found.", 404);
  }
}

/**
 * Hard-deletes selected leads from the database, along with their notes,
 * call logs, status history, and payment records (embedded subdocuments).
 */
export async function bulkDeleteLeads(
  user: SessionUser,
  leadIds: string[],
): Promise<number> {
  assertAdmin(user);
  await connectToDatabase();

  if (leadIds.length === 0) return 0;

  const result = await Lead.deleteMany({
    _id: { $in: leadIds.map((id) => new Types.ObjectId(id)) },
  });

  return result.deletedCount ?? 0;
}
