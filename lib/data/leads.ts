import { Types, type QueryFilter } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Lead, type ILead } from "@/lib/models/Lead";
import { PAGE_SIZE } from "@/lib/constants";
import type {
  LeadListResult,
  LeadStatus,
  LeadUserRef,
  LeadView,
  PaymentMode,
  PaymentStatus,
  SessionUser,
} from "@/lib/types";
import {
  endOfDay,
  escapeRegex,
  roundCurrency,
  startOfDay,
} from "@/lib/utils";

interface LeanUserRef {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
}

interface LeanNote {
  _id: Types.ObjectId;
  comment: string;
  createdBy: LeanUserRef | Types.ObjectId;
  createdAt: Date;
}

interface LeanCall {
  _id: Types.ObjectId;
  calledBy: LeanUserRef | Types.ObjectId;
  calledAt: Date;
  resultStatus: string;
}

interface LeanStatusChange {
  _id: Types.ObjectId;
  from: LeadStatus;
  to: LeadStatus;
  changedBy: LeanUserRef | Types.ObjectId;
  changedAt: Date;
  source?: "manual" | "call";
}

interface LeanPayment {
  _id: Types.ObjectId;
  amount: number;
  paidAt: Date;
  mode: PaymentMode;
  reference?: string | null;
  note?: string | null;
  repId?: LeanUserRef | Types.ObjectId | null;
  recordedBy: LeanUserRef | Types.ObjectId;
  createdAt: Date;
}

type LeanLead = Omit<
  ILead,
  "assignedTo" | "notes" | "callLogs" | "statusHistory" | "payments"
> & {
  _id: Types.ObjectId;
  assignedTo?: LeanUserRef | Types.ObjectId | null;
  notes?: LeanNote[];
  callLogs?: LeanCall[];
  statusHistory?: LeanStatusChange[];
  payments?: LeanPayment[];
};

export interface ListLeadFilters {
  q?: string;
  status?: LeadStatus;
  assigned?: string;
  category?: string;
  source?: string;
  payment?: PaymentStatus;
  page?: number;
  pageSize?: number;
  due?: "today" | "due" | "week";
  sort?: "recent" | "followup";
}

function mapUserRef(
  value: LeanUserRef | Types.ObjectId | null | undefined,
): LeadUserRef {
  if (!value) return { id: "", name: "Unassigned" };

  if (value instanceof Types.ObjectId) {
    return { id: value.toString(), name: "Team member" };
  }

  return {
    id: value._id.toString(),
    name: value.name || value.email || "Team member",
  };
}

export function mapLead(lead: LeanLead): LeadView {
  const payments = (lead.payments ?? []).map((payment) => ({
    id: payment._id.toString(),
    amount: roundCurrency(payment.amount),
    paidAt: new Date(payment.paidAt).toISOString(),
    mode: payment.mode,
    reference: payment.reference ?? null,
    note: payment.note ?? null,
    recordedBy: mapUserRef(payment.recordedBy),
    creditedRep: payment.repId ? mapUserRef(payment.repId) : null,
  }));
  const amountPaid = roundCurrency(
    payments.reduce((total, payment) => total + payment.amount, 0),
  );
  const dealValue = lead.dealValue ?? null;
  const amountDue =
    dealValue === null ? 0 : roundCurrency(Math.max(dealValue - amountPaid, 0));
  const paymentStatus: PaymentStatus =
    amountPaid <= 0
      ? "UNPAID"
      : dealValue !== null && amountPaid >= dealValue
        ? "PAID"
        : "PARTIAL";

  return {
    id: lead._id.toString(),
    businessName: lead.businessName,
    phoneNumber: lead.phoneNumber,
    cityState: lead.cityState ?? null,
    category: lead.category ?? null,
    source: lead.source ?? null,
    status: lead.status,
    assignedTo: lead.assignedTo ? mapUserRef(lead.assignedTo) : null,
    followUpDate: lead.followUpDate
      ? new Date(lead.followUpDate).toISOString()
      : null,
    dealValue,
    payments,
    amountPaid,
    amountDue,
    paymentStatus,
    notes: (lead.notes ?? []).map((note) => ({
      id: note._id.toString(),
      comment: note.comment,
      createdBy: mapUserRef(note.createdBy),
      createdAt: new Date(note.createdAt).toISOString(),
    })),
    callLogs: (lead.callLogs ?? []).map((call) => ({
      id: call._id.toString(),
      calledBy: mapUserRef(call.calledBy),
      calledAt: new Date(call.calledAt).toISOString(),
      resultStatus: call.resultStatus,
    })),
    statusHistory: (lead.statusHistory ?? []).map((change) => ({
      id: change._id.toString(),
      from: change.from,
      to: change.to,
      changedBy: mapUserRef(change.changedBy),
      changedAt: new Date(change.changedAt).toISOString(),
      source: change.source ?? "manual",
    })),
    createdAt: new Date(lead.createdAt).toISOString(),
    updatedAt: new Date(lead.updatedAt).toISOString(),
  };
}

export function buildLeadFilter(
  user: SessionUser,
  filters: ListLeadFilters,
): QueryFilter<ILead> {
  const query: QueryFilter<ILead> = {};

  if (user.role === "SALES_EXEC") {
    query.assignedTo = new Types.ObjectId(user.id);
  } else if (filters.assigned === "unassigned") {
    query.assignedTo = null;
  } else if (
    filters.assigned &&
    Types.ObjectId.isValid(filters.assigned)
  ) {
    query.assignedTo = new Types.ObjectId(filters.assigned);
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.category) {
    query.category = new RegExp(
      `^${escapeRegex(filters.category.trim())}$`,
      "i",
    );
  }

  if (filters.source) {
    query.source = filters.source.trim();
  }

  if (filters.payment) {
    const paidSum = {
      $sum: { $ifNull: ["$payments.amount", []] },
    };
    const paymentCount = {
      $size: { $ifNull: ["$payments", []] },
    };

    if (filters.payment === "UNPAID") {
      query.$expr = { $eq: [paymentCount, 0] };
    } else if (filters.payment === "PARTIAL") {
      query.$expr = {
        $and: [
          { $gt: [paymentCount, 0] },
          {
            $or: [
              { $eq: [{ $ifNull: ["$dealValue", null] }, null] },
              { $lt: [paidSum, "$dealValue"] },
            ],
          },
        ],
      };
    } else {
      query.$expr = {
        $and: [
          { $ne: [{ $ifNull: ["$dealValue", null] }, null] },
          { $gte: [paidSum, "$dealValue"] },
        ],
      };
    }
  }

  if (filters.q) {
    const regex = new RegExp(escapeRegex(filters.q), "i");
    query.$or = [
      { businessName: regex },
      { phoneNumber: regex },
      { cityState: regex },
      { category: regex },
    ];
  }

  if (filters.due === "today") {
    query.status = "FOLLOW_UP";
    query.followUpDate = { $gte: startOfDay(), $lte: endOfDay() };
  } else if (filters.due === "due") {
    query.status = "FOLLOW_UP";
    query.followUpDate = { $lte: endOfDay() };
  } else if (filters.due === "week") {
    query.status = "FOLLOW_UP";
    query.followUpDate = {
      $gte: startOfDay(),
      $lte: endOfDay(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    };
  }

  return query;
}

export async function listLeads(
  user: SessionUser,
  filters: ListLeadFilters = {},
): Promise<LeadListResult> {
  await connectToDatabase();

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? PAGE_SIZE));
  const query = buildLeadFilter(user, filters);
  const sort: Record<string, 1 | -1> =
    filters.sort === "followup"
      ? { followUpDate: 1, createdAt: -1 }
      : { updatedAt: -1 };

  const [total, docs] = await Promise.all([
    Lead.countDocuments(query),
    Lead.find(query)
      .populate("assignedTo", "name email")
      .populate("notes.createdBy", "name email")
      .populate("callLogs.calledBy", "name email")
      .populate("statusHistory.changedBy", "name email")
      .populate("payments.recordedBy", "name email")
      .populate("payments.repId", "name email")
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<LeanLead[]>(),
  ]);

  return {
    leads: docs.map(mapLead),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Distinct categories used by leads the current user can see, for filter and
 * import suggestions. Free-text on purpose: admins can import any category.
 */
export async function listLeadCategories(
  user: SessionUser,
): Promise<string[]> {
  await connectToDatabase();

  const query: QueryFilter<ILead> = {};

  if (user.role === "SALES_EXEC") {
    query.assignedTo = new Types.ObjectId(user.id);
  }

  const categories = await Lead.distinct("category", query);

  return categories
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .map((value) => value.trim())
    .sort((a, b) => a.localeCompare(b));
}

export async function getLeadForUser(
  leadId: string,
  user: SessionUser,
): Promise<LeadView | null> {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(leadId)) return null;

  const query: QueryFilter<ILead> = { _id: new Types.ObjectId(leadId) };

  if (user.role === "SALES_EXEC") {
    query.assignedTo = new Types.ObjectId(user.id);
  }

  const lead = await Lead.findOne(query)
    .populate("assignedTo", "name email")
    .populate("notes.createdBy", "name email")
    .populate("callLogs.calledBy", "name email")
    .populate("statusHistory.changedBy", "name email")
    .populate("payments.recordedBy", "name email")
    .populate("payments.repId", "name email")
    .lean<LeanLead | null>();

  return lead ? mapLead(lead) : null;
}
