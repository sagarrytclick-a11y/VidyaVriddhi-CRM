"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Percent,
  Power,
  Save,
  ShieldCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { Modal } from "@/components/crm/Modal";
import {
  createUserAction,
  toggleUserActiveAction,
  updateUserIncentiveAction,
} from "@/lib/actions/users";
import { DEFAULT_INCENTIVE_RATE, ROLE_LABELS } from "@/lib/constants";
import type {
  ActionResult,
  SessionUser,
  UserFormState,
  UserWithStats,
  UserRole,
} from "@/lib/types";
import { cn, formatDate, initials } from "@/lib/utils";

const initialState: UserFormState = { status: "idle" };

function roleBadge(role: UserRole): string {
  if (role === "SUPER_ADMIN") return "border-violet-200 bg-violet-50 text-violet-700";
  if (role === "ADMIN") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function UserRow({
  account,
  currentUser,
  onResult,
  onRequestDeactivate,
}: {
  account: UserWithStats;
  currentUser: SessionUser;
  onResult: (result: ActionResult) => void;
  onRequestDeactivate: (account: UserWithStats) => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isSelf = account.id === currentUser.id;
  const canToggle =
    !isSelf &&
    (currentUser.role === "SUPER_ADMIN" || account.role === "SALES_EXEC");
  const isSalesRep = account.role === "SALES_EXEC";
  const canEditIncentive = currentUser.role === "SUPER_ADMIN";
  const [rate, setRate] = useState(String(account.incentiveRate ?? 0));
  const [incentiveOn, setIncentiveOn] = useState(account.incentiveEnabled);
  const [rateError, setRateError] = useState("");
  const [ratePending, startRate] = useTransition();
  const rateDirty =
    Number(rate) !== (account.incentiveRate ?? 0) ||
    incentiveOn !== account.incentiveEnabled;

  function handleSaveRate() {
    setRateError("");
    const parsed = Number(rate);

    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setRateError("0–100 only");
      return;
    }

    startRate(async () => {
      const result = await updateUserIncentiveAction(
        account.id,
        parsed,
        incentiveOn,
      );
      onResult(result);

      if (result.ok) {
        router.refresh();
      } else {
        setRateError(result.error);
      }
    });
  }

  function handleToggle() {
    if (!canToggle) return;

    if (account.isActive) {
      // Deactivation removes this rep from every assigned lead, so ask
      // for confirmation in a proper dialog instead of a browser alert.
      onRequestDeactivate(account);
      return;
    }

    startTransition(async () => {
      const result = await toggleUserActiveAction(account.id);
      onResult(result);
      if (result.ok) router.refresh();
    });
  }

  return (
    <tr className="transition hover:bg-slate-50/60">
      <td className="table-cell">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold",
              account.isActive
                ? "bg-slate-300 text-slate-900"
                : "bg-slate-100 text-slate-400",
            )}
          >
            {initials(account.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">
              {account.name}
              {isSelf ? (
                <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  You
                </span>
              ) : null}
            </p>
            <p className="truncate text-xs text-slate-400">
              @{account.username}
            </p>
          </div>
        </div>
      </td>
      <td className="table-cell">
        <span className={cn("badge", roleBadge(account.role))}>
          {account.role === "SUPER_ADMIN" && <ShieldCheck className="h-3 w-3" />}
          {ROLE_LABELS[account.role]}
        </span>
      </td>
      <td className="table-cell text-right font-medium text-slate-900">
        {account.leadsAssigned}
      </td>
      <td className="table-cell text-right">{account.callsToday}</td>
      <td className="table-cell">
        {isSalesRep ? (
          canEditIncentive ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <button
                  type="button"
                  role="switch"
                  aria-checked={incentiveOn}
                  aria-label={`Incentive for ${account.name}`}
                  onClick={() => setIncentiveOn((value) => !value)}
                  className={cn(
                    "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-medium transition",
                    incentiveOn
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-500",
                  )}
                  title={
                    incentiveOn
                      ? "Incentive on — click to switch to fixed salary"
                      : "Fixed salary — click to enable incentive"
                  }
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      incentiveOn ? "bg-emerald-500" : "bg-slate-400",
                    )}
                  />
                  {incentiveOn ? "Incentive" : "Fixed"}
                </button>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={rate}
                    disabled={!incentiveOn}
                    onChange={(event) => setRate(event.target.value)}
                    aria-label={`Incentive rate for ${account.name}`}
                    className="input h-8 w-[76px] pr-6 text-right text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Percent className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                </div>
                <button
                  type="button"
                  onClick={handleSaveRate}
                  disabled={ratePending || !rateDirty}
                  className="icon-btn h-8 w-8"
                  title="Save incentive settings"
                  aria-label={`Save incentive settings for ${account.name}`}
                >
                  <Save className="h-3.5 w-3.5" />
                </button>
              </div>
              {rateError ? (
                <p className="text-[10px] text-rose-600">{rateError}</p>
              ) : null}
            </div>
          ) : (
            <span
              className={cn(
                "badge",
                account.incentiveEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-500",
              )}
            >
              {account.incentiveEnabled
                ? `${account.incentiveRate ?? 0}%`
                : "Fixed salary"}
            </span>
          )
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="table-cell">
        <span
          className={cn(
            "badge",
            account.isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-500",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              account.isActive ? "bg-emerald-500" : "bg-slate-400",
            )}
          />
          {account.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="table-cell text-right text-xs text-slate-500">
        {formatDate(account.createdAt)}
      </td>
      <td className="table-cell">
        <div className="flex justify-end">
          {account.role === "SALES_EXEC" ? (
            <Link
              href={`/dashboard/team/${account.id}`}
              className="icon-btn hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
              title={`View ${account.name}'s performance`}
              aria-label={`View ${account.name}'s performance`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
      </td>
      <td className="table-cell">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleToggle}
            disabled={!canToggle || pending}
            className={cn(
              "icon-btn",
              account.isActive
                ? "hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                : "hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600",
            )}
            title={
              isSelf
                ? "You cannot change your own access"
                : account.isActive
                  ? "Deactivate account"
                  : "Reactivate account"
            }
          >
            <Power className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function TeamManager({
  accounts,
  currentUser,
}: {
  accounts: UserWithStats[];
  currentUser: SessionUser;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialState,
  );
  const [toast, setToast] = useState<ActionResult | null>(null);
  const [deactivateTarget, setDeactivateTarget] =
    useState<UserWithStats | null>(null);
  const [deactivatePending, startDeactivate] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const canCreateAdmin = currentUser.role === "SUPER_ADMIN";

  function confirmDeactivate() {
    if (!deactivateTarget) return;

    startDeactivate(async () => {
      const result = await toggleUserActiveAction(deactivateTarget.id);
      setToast(result);

      if (result.ok) {
        setDeactivateTarget(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary"
        >
          <UserPlus className="h-4 w-4" />
          Add team member
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px]">
            <thead className="border-b border-slate-200 bg-slate-50/70">
              <tr>
                <th className="table-head">Member</th>
                <th className="table-head">Role</th>
                <th className="table-head text-right">Leads</th>
                <th className="table-head text-right">Calls today</th>
                <th className="table-head">Incentive %</th>
                <th className="table-head">Status</th>
                <th className="table-head text-right">Joined</th>
                <th className="table-head text-right">Performance</th>
                <th className="table-head text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {accounts.map((account) => (
                <UserRow
                  key={`${account.id}-${account.incentiveRate}-${account.incentiveEnabled}`}
                  account={account}
                  currentUser={currentUser}
                  onResult={setToast}
                  onRequestDeactivate={setDeactivateTarget}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a team member"
        description="Create a login with a name, username, and password. They can sign in immediately."
        size="md"
      >
        <form ref={formRef} action={formAction} className="space-y-4">
          {state.status === "error" ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {state.error}
            </div>
          ) : null}

          {state.status === "success" ? (
            <div className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-3 text-sm text-orange-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {state.message}
            </div>
          ) : null}

          <div>
            <label htmlFor="member-name" className="label">
              Full name
            </label>
            <input
              id="member-name"
              name="name"
              required
              minLength={2}
              placeholder="Riya Sharma"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="member-username" className="label">
              Username
            </label>
            <input
              id="member-username"
              name="username"
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9._-]+"
              placeholder="riya.sharma"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="input"
            />
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              They will use this to sign in. Letters, numbers, dots, dashes, or
              underscores.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="member-password" className="label">
                Password
              </label>
              <input
                id="member-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="member-role" className="label">
                Role
              </label>
              <select
                id="member-role"
                name="role"
                defaultValue="SALES_EXEC"
                className="input"
              >
                <option value="SALES_EXEC">Sales exec</option>
                {canCreateAdmin ? <option value="ADMIN">Admin</option> : null}
                {canCreateAdmin ? (
                  <option value="SUPER_ADMIN">Super admin</option>
                ) : null}
              </select>
            </div>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Sales execs only see leads assigned to them. Admins can import,
            assign, and view organization-wide reporting.
          </p>

          {canCreateAdmin ? (
            <>
              <div>
                <label htmlFor="member-incentive" className="label">
                  Incentive rate (%)
                </label>
                <div className="relative sm:max-w-[180px]">
                  <input
                    id="member-incentive"
                    name="incentiveRate"
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    defaultValue={DEFAULT_INCENTIVE_RATE}
                    className="input pr-8"
                  />
                  <Percent className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  Applied to payments actually received on this rep&apos;s
                  leads. You can change it any time from the team table.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                <input
                  type="checkbox"
                  name="incentiveEnabled"
                  defaultChecked
                  className="mt-0.5 h-4 w-4 accent-orange-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">
                    Incentive eligible
                  </span>
                  <span className="block text-xs leading-5 text-slate-500">
                    Turn this off for reps on a fixed salary. Only the super
                    admin can change this later.
                  </span>
                </span>
              </label>
            </>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary"
            >
              Close
            </button>
            <button type="submit" disabled={pending} className="btn-primary">
              <UserPlus className="h-4 w-4" />
              {pending ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deactivateTarget)}
        onClose={() => {
          if (!deactivatePending) setDeactivateTarget(null);
        }}
        title={`Deactivate ${deactivateTarget?.name ?? "this account"}?`}
        description="Their assigned leads will become unassigned."
        size="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setDeactivateTarget(null)}
              disabled={deactivatePending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={confirmDeactivate}
              disabled={deactivatePending}
            >
              <Power className="h-4 w-4" />
              {deactivatePending ? "Deactivating…" : "Deactivate account"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {deactivateTarget?.name} will no longer be able to sign in, and{" "}
              {deactivateTarget?.leadsAssigned === 1
                ? "their 1 lead"
                : `their ${deactivateTarget?.leadsAssigned ?? 0} leads`}{" "}
              will become unassigned.
            </p>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Reassign those leads first from the All leads page if you want them
            to keep working. You can reactivate the account any time.
          </p>
        </div>
      </Modal>

      {toast ? (
        <div
          className={cn(
            "animate-fade-in fixed bottom-5 right-5 z-[80] flex max-w-sm items-start gap-2.5 rounded-xl border bg-slate-100 px-4 py-3 text-sm shadow-lg",
            toast.ok
              ? "border-emerald-200 text-emerald-800"
              : "border-rose-200 text-rose-700",
          )}
        >
          {toast.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          )}
          {toast.ok ? toast.message : toast.error}
        </div>
      ) : null}
    </>
  );
}
