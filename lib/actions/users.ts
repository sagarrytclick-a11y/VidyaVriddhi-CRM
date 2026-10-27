"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createUser, toggleUserActive, updateUser } from "@/lib/services/users";
import { errorMessage, isServiceError } from "@/lib/services/errors";
import type {
  ActionResult,
  SessionUser,
  UserFormState,
} from "@/lib/types";
import {
  createUserSchema,
  objectIdSchema,
  updateUserSchema,
} from "@/lib/validators";

async function currentUserOrThrow(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function createUserAction(
  _previousState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  try {
    const actor = await currentUserOrThrow();
    const parsed = createUserSchema.safeParse({
      name: formData.get("name"),
      username: formData.get("username"),
      password: formData.get("password"),
      // The UI only creates sales reps; admin accounts come from the
      // environment (SUPER_ADMIN_*), not from this form.
      role: "SALES_EXEC",
      // These fields are hidden for non-super-admins; leave them undefined so
      // the schema defaults apply instead of coercing a missing value to 0.
      incentiveRate: formData.get("incentiveRate") ?? undefined,
      incentiveEnabled: formData.get("incentiveEnabled") ?? undefined,
    });

    if (!parsed.success) {
      return {
        status: "error",
        error:
          parsed.error.issues[0]?.message ?? "Check the account details.",
      };
    }

    await createUser(actor, parsed.data);
    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/leads");

    return {
      status: "success",
      message: `${parsed.data.name} can now sign in with the username @${parsed.data.username}.`,
    };
  } catch (error) {
    if (!isServiceError(error)) {
      console.error("Create user failed:", error);
    }

    return {
      status: "error",
      error: errorMessage(error),
    };
  }
}

export async function updateUserIncentiveAction(
  userId: string,
  incentiveRate: number,
  incentiveEnabled: boolean,
): Promise<ActionResult> {
  try {
    const actor = await currentUserOrThrow();
    const parsedId = objectIdSchema.safeParse(userId);
    const parsed = updateUserSchema.safeParse({
      incentiveRate,
      incentiveEnabled,
    });

    if (!parsedId.success || !parsed.success) {
      return { ok: false, error: "Enter an incentive rate between 0 and 100." };
    }

    await updateUser(actor, parsedId.data, {
      incentiveRate: parsed.data.incentiveRate,
      incentiveEnabled: parsed.data.incentiveEnabled,
    });
    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/analytics");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");
    return {
      ok: true,
      message: incentiveEnabled
        ? "Incentive settings updated."
        : "Incentive turned off. This rep is on a fixed salary.",
    };
  } catch (error) {
    if (!isServiceError(error)) {
      console.error("Update incentive failed:", error);
    }

    return { ok: false, error: errorMessage(error) };
  }
}

export async function toggleUserActiveAction(
  userId: string,
): Promise<ActionResult> {
  try {
    const actor = await currentUserOrThrow();
    const parsed = objectIdSchema.safeParse(userId);

    if (!parsed.success) {
      return { ok: false, error: "Invalid user." };
    }

    const result = await toggleUserActive(actor, parsed.data);
    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/analytics");

    return {
      ok: true,
      message: result.isActive ? "Account reactivated." : "Account deactivated.",
    };
  } catch (error) {
    if (!isServiceError(error)) {
      console.error("Toggle user failed:", error);
    }

    return { ok: false, error: errorMessage(error) };
  }
}
