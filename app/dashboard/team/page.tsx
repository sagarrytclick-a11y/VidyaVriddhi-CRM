import type { Metadata } from "next";
import { ShieldCheck, UserCheck, UsersRound, UserX } from "lucide-react";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { TeamManager } from "@/components/crm/TeamManager";
import { requireAdmin } from "@/lib/auth/session";
import { listUsersWithStats } from "@/lib/data/users";

export const metadata: Metadata = {
  title: "Team",
};

export default async function TeamPage() {
  const currentUser = await requireAdmin();
  const accounts = await listUsersWithStats();

  const active = accounts.filter((account) => account.isActive).length;
  const reps = accounts.filter(
    (account) => account.role === "SALES_EXEC",
  ).length;
  const admins = accounts.filter(
    (account) =>
      account.role === "ADMIN" || account.role === "SUPER_ADMIN",
  ).length;

  return (
    <>
      <PageHeader
        title="Team"
        description="Create sales reps, control access, and keep lead ownership clean."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total members"
          value={accounts.length}
          hint="All accounts"
          icon={UsersRound}
          tone="slate"
        />
        <StatCard
          label="Active"
          value={active}
          hint="Can sign in"
          icon={UserCheck}
          tone="orange"
        />
        <StatCard
          label="Sales reps"
          value={reps}
          hint="Lead owners"
          icon={UserCheck}
          tone="sky"
        />
        <StatCard
          label="Admins"
          value={admins}
          hint="Import and reporting access"
          icon={ShieldCheck}
          tone="violet"
        />
      </div>

      <section className="mt-8">
        <div className="mb-3">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            Accounts
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Deactivating a rep immediately removes their access and unassigns
            their leads so they can be redistributed.
          </p>
        </div>
        <TeamManager accounts={accounts} currentUser={currentUser} />
      </section>

      {accounts.filter((account) => !account.isActive).length > 0 ? (
        <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
          <UserX className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          Inactive accounts keep their history but cannot sign in. Reactivate an
          account to restore access.
        </div>
      ) : null}
    </>
  );
}
