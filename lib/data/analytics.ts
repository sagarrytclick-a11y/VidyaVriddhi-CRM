import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { CONNECTED_CALL_RESULTS, DEFAULT_INCENTIVE_RATE } from "@/lib/constants";
import { Lead } from "@/lib/models/Lead";
import { User } from "@/lib/models/User";
import type {
  AnalyticsData,
  CallTrendPoint,
  LeadStatus,
  PaymentMode,
  PersonalAnalytics,
  RepAttentionLead,
  RepPerformance,
  RepPerformanceDetail,
  RepRecentCall,
  RepRecentPayment,
  RepStageChange,
  SessionUser,
} from "@/lib/types";
import {
  endOfDay,
  endOfWeek,
  percentage,
  roundCurrency,
  startOfDay,
  startOfWeek,
} from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_DAYS = 7;
const TREND_DAYS = 14;

interface AssignmentRow {
  _id: Types.ObjectId | null;
  leadsAssigned: number;
  converted: number;
  meetings: number;
  proposals: number;
  followUpsToday: number;
  followUpsOverdue: number;
  contactedWithoutCall: number;
  staleLeads: number;
  lastActivityAt: Date | null;
}

interface CallRow {
  _id: Types.ObjectId | null;
  callsToday: number;
  callsThisWeek: number;
  connectedCallsThisWeek: number;
  uniqueLeadsCalledThisWeek: number;
}

interface StatusChangeRow {
  _id: Types.ObjectId | null;
  manualStageChangesThisWeek: number;
}

interface PaymentRow {
  _id: Types.ObjectId | null;
  paymentsCollected: number;
}

interface PaymentTotalsRow {
  totalDealValue: number;
  paymentsCollected: number;
  paymentsPending: number;
  paidDeals: number;
}

interface LeanRep {
  _id: Types.ObjectId;
  name: string;
  username: string;
  email?: string | null;
  role: SessionUser["role"];
  isActive: boolean;
  incentiveRate: number;
  incentiveEnabled?: boolean;
}

interface DetailLead {
  _id: Types.ObjectId;
  businessName: string;
  status: LeadStatus;
  assignedTo?: Types.ObjectId | null;
  callLogs?: {
    _id: Types.ObjectId;
    calledBy: Types.ObjectId;
    calledAt: Date;
    resultStatus: string;
  }[];
  statusHistory?: {
    _id: Types.ObjectId;
    from: LeadStatus;
    to: LeadStatus;
    changedBy: Types.ObjectId;
    changedAt: Date;
    source?: "manual" | "call";
  }[];
  payments?: {
    _id: Types.ObjectId;
    amount: number;
    paidAt: Date;
    mode: PaymentMode;
    repId?: Types.ObjectId | null;
  }[];
}

/** Dates coming out of aggregations can be null/invalid; never throw on them. */
function toIsoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateWindows() {
  const now = new Date();
  return {
    now,
    todayStart: startOfDay(now),
    todayEnd: endOfDay(now),
    weekStart: startOfWeek(now),
    weekEnd: endOfWeek(now),
    staleCutoff: new Date(now.getTime() - STALE_DAYS * DAY_MS),
  };
}

async function assignmentRows(): Promise<AssignmentRow[]> {
  const {
    todayStart,
    todayEnd,
    staleCutoff,
  } = dateWindows();

  return Lead.aggregate<AssignmentRow>([
    { $match: { assignedTo: { $ne: null } } },
    {
      $group: {
        _id: "$assignedTo",
        leadsAssigned: { $sum: 1 },
        converted: {
          $sum: { $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0] },
        },
        meetings: {
          $sum: { $cond: [{ $eq: ["$status", "MEETING"] }, 1, 0] },
        },
        proposals: {
          $sum: { $cond: [{ $eq: ["$status", "PROPOSAL"] }, 1, 0] },
        },
        followUpsToday: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "FOLLOW_UP"] },
                  { $gte: ["$followUpDate", todayStart] },
                  { $lte: ["$followUpDate", todayEnd] },
                ],
              },
              1,
              0,
            ],
          },
        },
        followUpsOverdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "FOLLOW_UP"] },
                  { $ne: ["$followUpDate", null] },
                  { $lt: ["$followUpDate", todayStart] },
                ],
              },
              1,
              0,
            ],
          },
        },
        // Stage advanced without a single call log on the lead.
        contactedWithoutCall: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $in: [
                      "$status",
                      ["CONTACTED", "FOLLOW_UP", "MEETING", "PROPOSAL", "CONVERTED"],
                    ],
                  },
                  { $eq: [{ $size: { $ifNull: ["$callLogs", []] } }, 0] },
                ],
              },
              1,
              0,
            ],
          },
        },
        // Open lead with no call in the last 7 days (never called counts too).
        staleLeads: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $not: [
                      { $in: ["$status", ["CONVERTED", "LOST"]] },
                    ],
                  },
                  {
                    $eq: [
                      {
                        $size: {
                          $filter: {
                            input: { $ifNull: ["$callLogs", []] },
                            as: "call",
                            cond: { $gte: ["$$call.calledAt", staleCutoff] },
                          },
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        lastActivityAt: { $max: "$callLogs.calledAt" },
      },
    },
  ]);
}

async function callRows(): Promise<CallRow[]> {
  const { todayStart, weekStart } = dateWindows();

  return Lead.aggregate<CallRow>([
    { $unwind: "$callLogs" },
    { $match: { "callLogs.calledAt": { $gte: weekStart } } },
    {
      $group: {
        _id: "$callLogs.calledBy",
        callsToday: {
          $sum: {
            $cond: [{ $gte: ["$callLogs.calledAt", todayStart] }, 1, 0],
          },
        },
        callsThisWeek: { $sum: 1 },
        connectedCallsThisWeek: {
          $sum: {
            $cond: [
              { $in: ["$callLogs.resultStatus", CONNECTED_CALL_RESULTS] },
              1,
              0,
            ],
          },
        },
        uniqueLeadsCalledThisWeek: { $addToSet: "$_id" },
      },
    },
    {
      $project: {
        callsToday: 1,
        callsThisWeek: 1,
        connectedCallsThisWeek: 1,
        uniqueLeadsCalledThisWeek: { $size: "$uniqueLeadsCalledThisWeek" },
      },
    },
  ]);
}

async function statusChangeRows(): Promise<StatusChangeRow[]> {
  const { weekStart } = dateWindows();

  return Lead.aggregate<StatusChangeRow>([
    { $unwind: "$statusHistory" },
    {
      $match: {
        "statusHistory.changedAt": { $gte: weekStart },
        "statusHistory.source": "manual",
      },
    },
    {
      $group: {
        _id: "$statusHistory.changedBy",
        manualStageChangesThisWeek: { $sum: 1 },
      },
    },
  ]);
}

async function paymentRows(): Promise<PaymentRow[]> {
  return Lead.aggregate<PaymentRow>([
    { $unwind: "$payments" },
    { $match: { "payments.repId": { $ne: null } } },
    {
      $group: {
        _id: "$payments.repId",
        paymentsCollected: { $sum: "$payments.amount" },
      },
    },
  ]);
}

async function paymentTotals(): Promise<PaymentTotalsRow> {
  const rows = await Lead.aggregate<PaymentTotalsRow>([
    {
      $project: {
        dealValue: { $ifNull: ["$dealValue", 0] },
        paid: { $sum: { $ifNull: ["$payments.amount", []] } },
      },
    },
    {
      $group: {
        _id: null,
        totalDealValue: { $sum: "$dealValue" },
        paymentsCollected: { $sum: "$paid" },
        paymentsPending: {
          $sum: {
            $cond: [
              { $gt: ["$dealValue", 0] },
              { $max: [{ $subtract: ["$dealValue", "$paid"] }, 0] },
              0,
            ],
          },
        },
        paidDeals: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ["$dealValue", 0] },
                  { $gte: ["$paid", "$dealValue"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return (
    rows[0] ?? {
      totalDealValue: 0,
      paymentsCollected: 0,
      paymentsPending: 0,
      paidDeals: 0,
    }
  );
}

function mapRows(
  reps: LeanRep[],
  assignments: AssignmentRow[],
  calls: CallRow[],
  statusChanges: StatusChangeRow[],
  payments: PaymentRow[],
): RepPerformance[] {
  const assignmentMap = new Map(
    assignments.map((row) => [String(row._id), row]),
  );
  const callMap = new Map(calls.map((row) => [String(row._id), row]));
  const statusChangeMap = new Map(
    statusChanges.map((row) => [String(row._id), row]),
  );
  const paymentMap = new Map(
    payments.map((row) => [String(row._id), row]),
  );

  return reps.map((rep) => {
    const id = rep._id.toString();
    const assignment = assignmentMap.get(id);
    const call = callMap.get(id);
    const statusChange = statusChangeMap.get(id);
    const payment = paymentMap.get(id);
    const leadsAssigned = assignment?.leadsAssigned ?? 0;
    const converted = assignment?.converted ?? 0;
    const incentiveRate = rep.incentiveRate ?? DEFAULT_INCENTIVE_RATE;
    const incentiveEnabled = rep.incentiveEnabled ?? true;
    const paymentsCollected = payment?.paymentsCollected ?? 0;

    return {
      id,
      name: rep.name,
      username: rep.username,
      email: rep.email ?? null,
      isActive: rep.isActive,
      leadsAssigned,
      converted,
      meetings: assignment?.meetings ?? 0,
      proposals: assignment?.proposals ?? 0,
      callsToday: call?.callsToday ?? 0,
      callsThisWeek: call?.callsThisWeek ?? 0,
      connectedCallsThisWeek: call?.connectedCallsThisWeek ?? 0,
      uniqueLeadsCalledThisWeek: call?.uniqueLeadsCalledThisWeek ?? 0,
      followUpsToday: assignment?.followUpsToday ?? 0,
      followUpsOverdue: assignment?.followUpsOverdue ?? 0,
      manualStageChangesThisWeek:
        statusChange?.manualStageChangesThisWeek ?? 0,
      contactedWithoutCall: assignment?.contactedWithoutCall ?? 0,
      staleLeads: assignment?.staleLeads ?? 0,
      lastActivityAt: toIsoOrNull(assignment?.lastActivityAt),
      conversionRate: percentage(converted, leadsAssigned),
      paymentsCollected,
      incentivesEarned: incentiveEnabled
        ? roundCurrency((paymentsCollected * incentiveRate) / 100)
        : 0,
      incentiveRate,
      incentiveEnabled,
    };
  });
}

export async function getAnalytics(): Promise<AnalyticsData> {
  await connectToDatabase();

  const { todayStart, todayEnd, weekStart, weekEnd } = dateWindows();

  const [
    totalLeads,
    unassignedLeads,
    convertedLeads,
    followUpsToday,
    followUpsThisWeek,
    reps,
    assignments,
    calls,
    statusChanges,
    payments,
    totals,
  ] = await Promise.all([
    Lead.countDocuments(),
    Lead.countDocuments({ assignedTo: null }),
    Lead.countDocuments({ status: "CONVERTED" }),
    Lead.countDocuments({
      status: "FOLLOW_UP",
      followUpDate: { $gte: todayStart, $lte: todayEnd },
    }),
    Lead.countDocuments({
      status: "FOLLOW_UP",
      followUpDate: { $gte: weekStart, $lte: weekEnd },
    }),
    User.find({ role: "SALES_EXEC" })
      .select("name username email role isActive incentiveRate incentiveEnabled")
      .sort({ name: 1 })
      .lean<LeanRep[]>(),
    assignmentRows(),
    callRows(),
    statusChangeRows(),
    paymentRows(),
    paymentTotals(),
  ]);

  const repPerformance = mapRows(
    reps,
    assignments,
    calls,
    statusChanges,
    payments,
  );
  const callsToday = calls.reduce((sum, row) => sum + row.callsToday, 0);
  const callsThisWeek = calls.reduce((sum, row) => sum + row.callsThisWeek, 0);
  const connectedCallsThisWeek = calls.reduce(
    (sum, row) => sum + row.connectedCallsThisWeek,
    0,
  );
  const manualStageChangesThisWeek = statusChanges.reduce(
    (sum, row) => sum + row.manualStageChangesThisWeek,
    0,
  );

  return {
    totalLeads,
    unassignedLeads,
    convertedLeads,
    conversionRate: percentage(convertedLeads, totalLeads),
    callsToday,
    callsThisWeek,
    connectedCallsThisWeek,
    followUpsToday,
    followUpsThisWeek,
    manualStageChangesThisWeek,
    contactedWithoutCall: assignments.reduce(
      (sum, row) => sum + row.contactedWithoutCall,
      0,
    ),
    staleLeads: assignments.reduce((sum, row) => sum + row.staleLeads, 0),
    totalDealValue: totals.totalDealValue,
    paymentsCollected: totals.paymentsCollected,
    paymentsPending: totals.paymentsPending,
    incentivesEarned: roundCurrency(
      repPerformance.reduce((sum, rep) => sum + rep.incentivesEarned, 0),
    ),
    reps: repPerformance,
  };
}

function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function buildCallTrend(
  leads: DetailLead[],
  repId: string,
): CallTrendPoint[] {
  const today = startOfDay(new Date());
  const buckets = new Map<string, { calls: number; connected: number }>();

  for (let index = TREND_DAYS - 1; index >= 0; index -= 1) {
    buckets.set(dateKey(new Date(today.getTime() - index * DAY_MS)), {
      calls: 0,
      connected: 0,
    });
  }

  for (const lead of leads) {
    for (const call of lead.callLogs ?? []) {
      if (String(call.calledBy) !== repId) continue;

      const key = dateKey(new Date(call.calledAt));
      const bucket = buckets.get(key);
      if (!bucket) continue;

      bucket.calls += 1;
      if (
        (CONNECTED_CALL_RESULTS as readonly string[]).includes(
          call.resultStatus,
        )
      ) {
        bucket.connected += 1;
      }
    }
  }

  return [...buckets.entries()].map(([date, value]) => ({
    date,
    label: new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
    }),
    calls: value.calls,
    connected: value.connected,
  }));
}

export async function getRepPerformanceDetail(
  repId: string,
): Promise<RepPerformanceDetail | null> {
  await connectToDatabase();

  if (!Types.ObjectId.isValid(repId)) return null;

  const rep = await User.findById(repId)
    .select("name username email role isActive incentiveRate incentiveEnabled")
    .lean<LeanRep | null>();

  if (!rep || rep.role !== "SALES_EXEC") return null;

  const analytics = await getAnalytics();
  const performance = analytics.reps.find((row) => row.id === repId);

  if (!performance) return null;

  const repObjectId = new Types.ObjectId(repId);
  const { staleCutoff } = dateWindows();

  const leads = await Lead.find({
    $or: [
      { assignedTo: repObjectId },
      { "callLogs.calledBy": repObjectId },
      { "statusHistory.changedBy": repObjectId },
      { "payments.repId": repObjectId },
    ],
  })
    .select("businessName status assignedTo callLogs statusHistory payments")
    .lean<DetailLead[]>();

  const recentCalls: RepRecentCall[] = [];
  const recentPayments: RepRecentPayment[] = [];
  const recentStageChanges: RepStageChange[] = [];
  const attentionLeads: RepAttentionLead[] = [];

  for (const lead of leads) {
    const leadId = lead._id.toString();

    for (const call of lead.callLogs ?? []) {
      if (String(call.calledBy) !== repId) continue;

      recentCalls.push({
        id: call._id.toString(),
        leadId,
        businessName: lead.businessName,
        calledAt: new Date(call.calledAt).toISOString(),
        resultStatus: call.resultStatus,
      });
    }

    for (const change of lead.statusHistory ?? []) {
      if (String(change.changedBy) !== repId) continue;

      recentStageChanges.push({
        id: change._id.toString(),
        leadId,
        businessName: lead.businessName,
        from: change.from,
        to: change.to,
        changedAt: new Date(change.changedAt).toISOString(),
        source: change.source ?? "manual",
      });
    }

    for (const payment of lead.payments ?? []) {
      if (String(payment.repId ?? "") !== repId) continue;

      recentPayments.push({
        id: payment._id.toString(),
        leadId,
        businessName: lead.businessName,
        amount: payment.amount,
        paidAt: new Date(payment.paidAt).toISOString(),
        mode: payment.mode,
      });
    }

    if (String(lead.assignedTo ?? "") !== repId) continue;
    if (lead.status === "CONVERTED" || lead.status === "LOST") continue;

    const calls = (lead.callLogs ?? []).filter(
      (call) => String(call.calledBy) === repId,
    );
    const lastCalledAt = calls.reduce<Date | null>((latest, call) => {
      const at = new Date(call.calledAt);
      return !latest || at > latest ? at : latest;
    }, null);

    const isStale = !lastCalledAt || lastCalledAt < staleCutoff;
    if (!isStale) continue;

    attentionLeads.push({
      id: leadId,
      businessName: lead.businessName,
      status: lead.status,
      lastCalledAt: lastCalledAt ? lastCalledAt.toISOString() : null,
      callCount: calls.length,
      daysSinceCall: lastCalledAt
        ? Math.floor(
            (startOfDay(new Date()).getTime() -
              startOfDay(lastCalledAt).getTime()) /
              DAY_MS,
          )
        : null,
    });
  }

  recentCalls.sort(
    (a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime(),
  );
  recentStageChanges.sort(
    (a, b) =>
      new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
  );
  recentPayments.sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
  );
  attentionLeads.sort((a, b) => {
    if (!a.lastCalledAt) return -1;
    if (!b.lastCalledAt) return 1;
    return (
      new Date(a.lastCalledAt).getTime() -
      new Date(b.lastCalledAt).getTime()
    );
  });

  return {
    rep: {
      id: rep._id.toString(),
      name: rep.name,
      username: rep.username,
      email: rep.email ?? null,
      isActive: rep.isActive,
    },
    performance,
    callTrend: buildCallTrend(leads, repId),
    recentCalls: recentCalls.slice(0, 15),
    recentPayments: recentPayments.slice(0, 10),
    attentionLeads: attentionLeads.slice(0, 10),
    recentStageChanges: recentStageChanges.slice(0, 10),
  };
}

export async function getPersonalAnalytics(
  user: SessionUser,
): Promise<PersonalAnalytics> {
  await connectToDatabase();

  const { todayStart, todayEnd, weekStart, weekEnd } = dateWindows();
  const assignedTo = new Types.ObjectId(user.id);

  const [totalLeads, convertedLeads, followUpsToday, followUpsThisWeek, calls, payments, profile] =
    await Promise.all([
      Lead.countDocuments({ assignedTo }),
      Lead.countDocuments({ assignedTo, status: "CONVERTED" }),
      Lead.countDocuments({
        assignedTo,
        status: "FOLLOW_UP",
        followUpDate: { $gte: todayStart, $lte: todayEnd },
      }),
      Lead.countDocuments({
        assignedTo,
        status: "FOLLOW_UP",
        followUpDate: { $gte: weekStart, $lte: weekEnd },
      }),
      Lead.aggregate<{ callsToday: number; callsThisWeek: number }>([
        { $match: { assignedTo } },
        { $unwind: "$callLogs" },
        {
          $match: {
            "callLogs.calledBy": assignedTo,
            "callLogs.calledAt": { $gte: weekStart },
          },
        },
        {
          $group: {
            _id: null,
            callsToday: {
              $sum: {
                $cond: [{ $gte: ["$callLogs.calledAt", todayStart] }, 1, 0],
              },
            },
            callsThisWeek: { $sum: 1 },
          },
        },
      ]),
      Lead.aggregate<{ paymentsCollected: number }>([
        { $unwind: "$payments" },
        { $match: { "payments.repId": assignedTo } },
        {
          $group: {
            _id: null,
            paymentsCollected: { $sum: "$payments.amount" },
          },
        },
      ]),
      User.findById(assignedTo)
        .select("incentiveRate incentiveEnabled")
        .lean<{ incentiveRate: number; incentiveEnabled?: boolean } | null>(),
    ]);

  const incentiveRate = profile?.incentiveRate ?? DEFAULT_INCENTIVE_RATE;
  const incentiveEnabled = profile?.incentiveEnabled ?? true;
  const paymentsCollected = roundCurrency(
    payments[0]?.paymentsCollected ?? 0,
  );

  return {
    totalLeads,
    unassignedLeads: 0,
    convertedLeads,
    conversionRate: percentage(convertedLeads, totalLeads),
    callsToday: calls[0]?.callsToday ?? 0,
    callsThisWeek: calls[0]?.callsThisWeek ?? 0,
    followUpsToday,
    followUpsThisWeek,
    paymentsCollected,
    incentivesEarned: incentiveEnabled
      ? roundCurrency((paymentsCollected * incentiveRate) / 100)
      : 0,
    incentiveRate,
    incentiveEnabled,
  };
}
