import type { LeadStatus, UserRole } from "@/lib/types";

export const SESSION_COOKIE = "crm_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "MEETING",
  "PROPOSAL",
  "CONVERTED",
  "LOST",
] as const satisfies readonly LeadStatus[];

export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SALES_EXEC",
] as const satisfies readonly UserRole[];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow up",
  MEETING: "Developer meeting",
  PROPOSAL: "Proposal sent",
  CONVERTED: "Converted",
  LOST: "Lost",
};

export const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "border-slate-200 bg-slate-50 text-slate-600",
  CONTACTED: "border-sky-200 bg-sky-50 text-sky-700",
  FOLLOW_UP: "border-amber-200 bg-amber-50 text-amber-700",
  MEETING: "border-violet-200 bg-violet-50 text-violet-700",
  PROPOSAL: "border-orange-200 bg-orange-50 text-orange-700",
  CONVERTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  LOST: "border-rose-200 bg-rose-50 text-rose-700",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SALES_EXEC: "Sales Executive",
};

export const CALL_RESULTS = [
  "Connected",
  "No answer",
  "Busy",
  "Callback requested",
  "Not interested",
  "Wrong number",
  "Converted",
] as const;

/**
 * Outcomes that mean the rep actually spoke to someone. Connect rate is
 * calculated from these, so "No answer"/"Busy" cannot inflate activity.
 */
export const CONNECTED_CALL_RESULTS = [
  "Connected",
  "Callback requested",
  "Not interested",
  "Converted",
] as const;

export const PAYMENT_MODES = [
  "Cash",
  "UPI",
  "Bank transfer",
  "Cheque",
  "Card",
  "Other",
] as const;

/** Payments can only be recorded once the deal reaches the meeting stage. */
export const PAYMENT_ELIGIBLE_STATUSES = [
  "MEETING",
  "PROPOSAL",
  "CONVERTED",
] as const;

export const PAYMENT_STATUS_LABELS = {
  UNPAID: "Unpaid",
  PARTIAL: "Partially paid",
  PAID: "Fully paid",
} as const;

export const PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID"] as const;

export const PAYMENT_STATUS_STYLES = {
  UNPAID: "border-slate-200 bg-slate-50 text-slate-600",
  PARTIAL: "border-amber-200 bg-amber-50 text-amber-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
} as const;

export const DEFAULT_INCENTIVE_RATE = 5;

export const DEFAULT_WHATSAPP_TEMPLATE_ID = "intro";

export interface WhatsAppTemplate {
  id: string;
  label: string;
  description: string;
  body: string;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "intro",
    label: "Introduction",
    description: "First touch from your sales rep",
    body: "Hi {{businessName}} team, this is {{repName}} from our sales team. I came across your business and would love to understand how we can help you grow. Is now a good time to talk?",
  },
  {
    id: "follow-up",
    label: "Follow-up",
    description: "A warm nudge after the first call",
    body: "Hi {{businessName}} team, following up on our recent conversation. I wanted to check if you had a chance to think it over and if you have any questions I can answer.",
  },
  {
    id: "offer",
    label: "Offer / next step",
    description: "Move a warm lead toward a decision",
    body: "Hi {{businessName}} team, we have a limited-time offer that could be a great fit for your business. Would you be open to a quick 10-minute call this week?",
  },
];

export const PAGE_SIZE = 20;
export const MAX_IMPORT_ROWS = 5_000;
export const DEFAULT_COUNTRY_CODE =
  process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE?.replace(/\D/g, "") || "91";
