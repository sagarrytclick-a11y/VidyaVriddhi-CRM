import {
  handleApiError,
  jsonData,
  jsonError,
  readJson,
  requireApiUser,
} from "@/lib/api";
import { recordPayment } from "@/lib/services/leads";
import { recordPaymentSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  context: RouteContext<"/api/leads/[id]/payments">,
) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const { id } = await context.params;
  const body = await readJson(request);
  const parsed = recordPaymentSchema.safeParse({
    ...(body && typeof body === "object" ? body : {}),
    leadId: id,
  });

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid payment.",
      422,
    );
  }

  try {
    const payment = await recordPayment(auth.user, parsed.data);
    return jsonData(payment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
