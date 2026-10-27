import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { handleApiError, jsonError, readJson } from "@/lib/api";
import { intakeLeads, type IntakeLeadInput } from "@/lib/services/leads";
import { intakeLeadSchema, intakeRequestSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/**
 * Permissive CORS so a marketing site on another origin can post leads
 * straight from the browser. The API key (not a cookie) is the credential.
 */
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, x-api-key, authorization",
  "access-control-max-age": "86400",
} as const;

function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function readApiKey(request: Request): string {
  const headerKey = request.headers.get("x-api-key");
  if (headerKey) return headerKey.trim();

  const authorization = request.headers.get("authorization");
  if (!authorization) return "";

  const [scheme, ...rest] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer") return "";

  return rest.join(" ").trim();
}

/** Constant-time comparison so the key cannot be guessed by timing. */
function keysMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  const expectedKey = process.env.LEAD_API_KEY?.trim();

  if (!expectedKey) {
    return withCors(
      jsonError(
        "Lead intake is not configured. Set LEAD_API_KEY on the server.",
        503,
      ),
    );
  }

  if (!keysMatch(readApiKey(request), expectedKey)) {
    return withCors(jsonError("Invalid API key.", 401));
  }

  try {
    const body = await readJson(request);
    const isRecord =
      typeof body === "object" && body !== null && !Array.isArray(body);

    // A single lead object is accepted as a convenience for simple forms.
    const payload =
      isRecord && "leads" in body
        ? body
        : { leads: Array.isArray(body) ? body : [body] };

    const parsed = intakeRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return withCors(
        jsonError(
          parsed.error.issues[0]?.message ?? "Invalid lead payload.",
          422,
        ),
      );
    }

    const leads: IntakeLeadInput[] = [];
    const skipped: { phoneNumber: string; reason: "duplicate" | "invalid" }[] =
      [];
    let firstError: string | null = null;

    for (const row of parsed.data.leads) {
      const lead = intakeLeadSchema.safeParse(row);

      if (!lead.success) {
        firstError ??= lead.error.issues[0]?.message ?? "Invalid lead row.";
        const rawPhone =
          typeof row === "object" && row !== null && "phoneNumber" in row
            ? String((row as { phoneNumber?: unknown }).phoneNumber ?? "")
            : "";
        skipped.push({ phoneNumber: rawPhone || "(missing)", reason: "invalid" });
        continue;
      }

      leads.push(lead.data);
    }

    // Every row was malformed: fail loudly instead of returning an empty 200.
    if (leads.length === 0 && skipped.length > 0) {
      return withCors(jsonError(firstError ?? "Invalid lead payload.", 422));
    }

    const result = await intakeLeads({
      leads,
      autoAssign: parsed.data.autoAssign,
    });

    const allSkipped = [...skipped, ...result.skipped];

    return withCors(
      NextResponse.json(
        {
          data: {
            created: result.created,
            skipped: allSkipped,
            createdCount: result.created.length,
            skippedCount: allSkipped.length,
          },
        },
        { status: result.created.length > 0 ? 201 : 200 },
      ),
    );
  } catch (error) {
    return withCors(handleApiError(error));
  }
}
