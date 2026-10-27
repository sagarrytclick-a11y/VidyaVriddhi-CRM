import { z } from "zod";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  PAYMENT_MODES,
  PAYMENT_STATUSES,
  USER_ROLES,
  normalizeLeadSource,
} from "@/lib/constants";

export const loginSchema = z
  .object({
    // New clients send `identifier`; `email` stays supported for older
    // API clients that still post an email address.
    identifier: z.string().trim().toLowerCase().max(120).optional(),
    email: z.string().trim().toLowerCase().max(120).optional(),
    password: z.string().min(6, "Password must be at least 6 characters."),
  })
  .refine((value) => Boolean(value.identifier || value.email), {
    message: "Enter your username or email.",
    path: ["identifier"],
  });

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(
    /^[a-z0-9._-]+$/,
    "Use only letters, numbers, dots, dashes, or underscores.",
  );

export const leadStatusSchema = z.enum(LEAD_STATUSES);

/**
 * Accepts "gmb", "google_ads", "Meta" and other common spellings, then
 * stores the canonical label. Unknown values fail validation.
 */
const leadSourceInput = z.preprocess(
  (value) =>
    typeof value === "string" ? (normalizeLeadSource(value) ?? value) : value,
  z.enum(LEAD_SOURCES).optional().nullable(),
);

export const userRoleSchema = z.enum(USER_ROLES);

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid record id.");

export const paymentModeSchema = z.enum(PAYMENT_MODES);

export const recordPaymentSchema = z.object({
  leadId: objectIdSchema,
  amount: z.coerce
    .number()
    .positive("Enter a payment amount greater than zero.")
    .max(1_000_000_000, "Payment amount is too large."),
  paidAt: z.string().trim().optional().nullable(),
  mode: paymentModeSchema,
  reference: z.string().trim().max(120).optional().nullable(),
  note: z.string().trim().max(1_000).optional().nullable(),
});

export const dealValueSchema = z.object({
  leadId: objectIdSchema,
  dealValue: z.coerce
    .number()
    .positive("Enter a total deal amount greater than zero.")
    .max(1_000_000_000, "Deal amount is too large."),
});

export const deletePaymentSchema = z.object({
  leadId: objectIdSchema,
  paymentId: objectIdSchema,
});

export const logCallSchema = z.object({
  leadId: objectIdSchema,
  status: leadStatusSchema,
  resultStatus: z.string().trim().min(2, "Choose a call result.").max(80),
  followUpDate: z.string().trim().optional().nullable(),
  note: z.string().trim().max(2_000).optional().nullable(),
});

export const addNoteSchema = z.object({
  leadId: objectIdSchema,
  comment: z
    .string()
    .trim()
    .min(1, "Write a note before saving.")
    .max(2_000, "Keep notes under 2,000 characters."),
});

export const assignLeadSchema = z.object({
  leadId: objectIdSchema,
  assignedTo: objectIdSchema.nullable(),
});

export const bulkAssignSchema = z.object({
  leadIds: z
    .array(objectIdSchema)
    .min(1, "Select at least one lead.")
    .max(500, "Assign at most 500 leads at a time."),
  assignedTo: objectIdSchema.nullable(),
});

export const bulkDeleteSchema = z.object({
  leadIds: z
    .array(objectIdSchema)
    .min(1, "Select at least one lead.")
    .max(500, "Delete at most 500 leads at a time."),
});

export const assignAllSchema = z.object({
  mode: z.enum(["single", "split"]),
  repId: objectIdSchema.optional().nullable(),
  q: z.string().trim().max(120).optional().nullable(),
  category: z.string().trim().max(100).optional().nullable(),
  source: z.string().trim().max(60).optional().nullable(),
  payment: z.enum(PAYMENT_STATUSES).optional().nullable(),
  status: leadStatusSchema.optional().nullable(),
  assigned: z.string().trim().max(64).optional().nullable(),
});

export const createLeadSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required.").max(200),
  phoneNumber: z.string().trim().min(6, "Phone number is required.").max(30),
  cityState: z.string().trim().max(200).optional().nullable(),
  category: z.string().trim().max(100).optional().nullable(),
  source: leadSourceInput,
  assignedTo: objectIdSchema.optional().nullable(),
});

/**
 * External lead intake. Kept separate from `createLeadSchema` because it is
 * used by API-key clients: `source` is free text (aliases allowed) and a
 * missing/unknown value becomes "Other" instead of failing the request.
 */
export const intakeLeadSchema = z.object({
  businessName: z.string().trim().min(2, "businessName is required.").max(200),
  phoneNumber: z.string().trim().min(6, "phoneNumber is required.").max(30),
  cityState: z.string().trim().max(200).optional().nullable(),
  category: z.string().trim().max(100).optional().nullable(),
  source: z.string().trim().max(60).optional().nullable(),
});

export const intakeRequestSchema = z.object({
  // Rows are validated one by one so a single bad row does not reject a
  // whole webhook batch; see `app/api/leads/intake/route.ts`.
  leads: z
    .array(z.unknown())
    .min(1, "Send at least one lead.")
    .max(500, "Send at most 500 leads per request."),
  autoAssign: z.boolean().default(false),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  username: usernameSchema,
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128, "Password is too long."),
  role: userRoleSchema,
  incentiveRate: z.coerce.number().min(0).max(100).default(5),
  incentiveEnabled: z
    .preprocess(
      (value) =>
        value === true || value === "on" || value === "true" || value === "1",
      z.boolean(),
    )
    .default(true),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  incentiveRate: z.coerce.number().min(0).max(100).optional(),
  incentiveEnabled: z.boolean().optional(),
});

export const leadFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: leadStatusSchema.optional(),
  assigned: z.string().trim().max(40).optional(),
  category: z.string().trim().max(100).optional(),
  source: z.string().trim().max(60).optional(),
  payment: z.enum(PAYMENT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
