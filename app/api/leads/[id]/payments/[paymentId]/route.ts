import {
  handleApiError,
  jsonData,
  requireApiAdmin,
  requireApiUser,
} from "@/lib/api";
import { deletePayment } from "@/lib/services/leads";

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/leads/[id]/payments/[paymentId]">,
) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const denied = requireApiAdmin(auth.user);
  if (denied) return denied;

  const { id, paymentId } = await context.params;

  try {
    await deletePayment(auth.user, id, paymentId);
    return jsonData({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
