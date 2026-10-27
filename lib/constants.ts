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

/**
 * Where a lead came from ("head"). Kept as a fixed list so source reporting
 * stays clean and comparable; "Other" is the escape hatch.
 */
export const LEAD_SOURCES = [
  "Google My Business",
  "Google Ads",
  "Meta Ads",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Website",
  "Referral",
  "Walk-in",
  "Cold Call",
  "JustDial",
  "IndiaMART",
  "LinkedIn",
  "YouTube",
  "Event",
  "Other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

/**
 * Common spellings that external sites and CSVs send. Anything unknown is
 * rejected by validation (or mapped to "Other" by the intake API).
 */
const LEAD_SOURCE_ALIASES: Record<string, LeadSource> = {
  gmb: "Google My Business",
  "google my business": "Google My Business",
  "google business": "Google My Business",
  googlemaps: "Google My Business",
  "google maps": "Google My Business",
  "google business profile": "Google My Business",
  google: "Google Ads",
  adwords: "Google Ads",
  "google adwords": "Google Ads",
  "google ads": "Google Ads",
  ppc: "Google Ads",
  meta: "Meta Ads",
  "meta ads": "Meta Ads",
  "facebook ads": "Meta Ads",
  "instagram ads": "Meta Ads",
  "fb ads": "Meta Ads",
  insta: "Instagram",
  instagram: "Instagram",
  fb: "Facebook",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  "whats app": "WhatsApp",
  website: "Website",
  web: "Website",
  organic: "Website",
  seo: "Website",
  referral: "Referral",
  reference: "Referral",
  "word of mouth": "Referral",
  "walk in": "Walk-in",
  walkin: "Walk-in",
  "walk-in": "Walk-in",
  "cold call": "Cold Call",
  coldcall: "Cold Call",
  "cold calling": "Cold Call",
  justdial: "JustDial",
  "just dial": "JustDial",
  indiamart: "IndiaMART",
  "india mart": "IndiaMART",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  event: "Event",
  exhibition: "Event",
  expo: "Event",
  other: "Other",
};

/** Resolves free-form text ("gmb", "Meta", "google_ads") to a known source. */
export function normalizeLeadSource(
  value: string | null | undefined,
): LeadSource | null {
  if (!value) return null;

  const key = value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!key) return null;

  const exact = LEAD_SOURCES.find(
    (source) => source.toLowerCase() === key,
  );

  return exact ?? LEAD_SOURCE_ALIASES[key] ?? null;
}

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
