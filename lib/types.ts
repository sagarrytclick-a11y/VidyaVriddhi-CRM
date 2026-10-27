export type UserRole = "SUPER_ADMIN" | "ADMIN" | "SALES_EXEC";

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "FOLLOW_UP"
  | "MEETING"
  | "PROPOSAL"
  | "CONVERTED"
  | "LOST";

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: UserRole;
}

export interface UserOption {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  incentiveRate: number;
  incentiveEnabled: boolean;
}

export interface LeadUserRef {
  id: string;
  name: string;
}

export interface LeadNoteView {
  id: string;
  comment: string;
  createdBy: LeadUserRef;
  createdAt: string;
}

export interface LeadCallView {
  id: string;
  calledBy: LeadUserRef;
  calledAt: string;
  resultStatus: string;
}

export type PaymentMode =
  | "Cash"
  | "UPI"
  | "Bank transfer"
  | "Cheque"
  | "Card"
  | "Other";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export interface LeadPaymentView {
  id: string;
  amount: number;
  paidAt: string;
  mode: PaymentMode;
  reference: string | null;
  note: string | null;
  recordedBy: LeadUserRef;
  creditedRep: LeadUserRef | null;
}

export interface LeadStatusChangeView {
  id: string;
  from: LeadStatus;
  to: LeadStatus;
  changedBy: LeadUserRef;
  changedAt: string;
  source: "manual" | "call";
}

export interface LeadView {
  id: string;
  businessName: string;
  phoneNumber: string;
  cityState: string | null;
  category: string | null;
  status: LeadStatus;
  assignedTo: LeadUserRef | null;
  followUpDate: string | null;
  dealValue: number | null;
  payments: LeadPaymentView[];
  amountPaid: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
  notes: LeadNoteView[];
  callLogs: LeadCallView[];
  statusHistory: LeadStatusChangeView[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadListResult {
  leads: LeadView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RepPerformance {
  id: string;
  name: string;
  username: string;
  email: string | null;
  isActive: boolean;
  leadsAssigned: number;
  converted: number;
  meetings: number;
  proposals: number;
  callsToday: number;
  callsThisWeek: number;
  connectedCallsThisWeek: number;
  uniqueLeadsCalledThisWeek: number;
  followUpsToday: number;
  followUpsOverdue: number;
  manualStageChangesThisWeek: number;
  contactedWithoutCall: number;
  staleLeads: number;
  lastActivityAt: string | null;
  conversionRate: number;
  paymentsCollected: number;
  incentivesEarned: number;
  incentiveRate: number;
  incentiveEnabled: boolean;
}

export interface CallTrendPoint {
  date: string;
  label: string;
  calls: number;
  connected: number;
}

export interface RepRecentCall {
  id: string;
  leadId: string;
  businessName: string;
  calledAt: string;
  resultStatus: string;
}

export interface RepRecentPayment {
  id: string;
  leadId: string;
  businessName: string;
  amount: number;
  paidAt: string;
  mode: PaymentMode;
}

export interface RepAttentionLead {
  id: string;
  businessName: string;
  status: LeadStatus;
  lastCalledAt: string | null;
  callCount: number;
  daysSinceCall: number | null;
}

export interface RepStageChange {
  id: string;
  leadId: string;
  businessName: string;
  from: LeadStatus;
  to: LeadStatus;
  changedAt: string;
  source: "manual" | "call";
}

export interface RepPerformanceDetail {
  rep: {
    id: string;
    name: string;
    username: string;
    email: string | null;
    isActive: boolean;
  };
  performance: RepPerformance;
  callTrend: CallTrendPoint[];
  recentCalls: RepRecentCall[];
  recentPayments: RepRecentPayment[];
  attentionLeads: RepAttentionLead[];
  recentStageChanges: RepStageChange[];
}

export interface AnalyticsData {
  totalLeads: number;
  unassignedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  callsToday: number;
  callsThisWeek: number;
  connectedCallsThisWeek: number;
  followUpsToday: number;
  followUpsThisWeek: number;
  manualStageChangesThisWeek: number;
  contactedWithoutCall: number;
  staleLeads: number;
  totalDealValue: number;
  paymentsCollected: number;
  paymentsPending: number;
  incentivesEarned: number;
  reps: RepPerformance[];
}

export interface PersonalAnalytics {
  totalLeads: number;
  unassignedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  callsToday: number;
  callsThisWeek: number;
  followUpsToday: number;
  followUpsThisWeek: number;
  paymentsCollected: number;
  incentivesEarned: number;
  incentiveRate: number;
  incentiveEnabled: boolean;
}

export interface UserWithStats extends UserOption {
  leadsAssigned: number;
  callsToday: number;
  createdAt: string;
}

export interface ActionSuccess {
  ok: true;
  message?: string;
}

export interface ActionFailure {
  ok: false;
  error: string;
}

export type ActionResult = ActionSuccess | ActionFailure;

export type ImportActionState =
  | { status: "idle" }
  | {
      status: "success";
      imported: number;
      skipped: number;
      unassigned: number;
      message: string;
    }
  | { status: "error"; error: string };

export type UserFormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; error: string };
