import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  Clock,
  IndianRupee,
  MousePointerClick,
  PhoneCall,
  ShieldAlert,
  Target,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { CallTrendChart } from "@/components/crm/CallTrendChart";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { requireAdmin } from "@/lib/auth/session";
import { CONNECTED_CALL_RESULTS } from "@/lib/constants";
import { getRepPerformanceDetail } from "@/lib/data/analytics";
import { cn, formatCurrency, formatDate, percentage } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Rep performance",
};

function lastActivityLabel(value: string | null): string {
  if (!value) return "No calls yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(value);
}

export default async function RepPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const detail = await getRepPerformanceDetail(id);

  if (!detail) notFound();

  const {
    rep,
    performance,
    callTrend,
    recentCalls,
    recentPayments,
    attentionLeads,
    recentStageChanges,
  } = detail;
  const connectRate = percentage(
    performance.connectedCallsThisWeek,
    performance.callsThisWeek,
  );

  return (
    <>
      <PageHeader
        title={rep.name}
        description={`@${rep.username} · Sales Executive · ${rep.isActive ? "Active" : "Inactive"}`}
        actions={
          <>
            <Link href="/dashboard/team" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to team
            </Link>
            <Link
              href={`/dashboard/leads?assigned=${rep.id}`}
              className="btn-primary"
            >
              View assigned leads
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Leads assigned"
          value={performance.leadsAssigned}
          hint={`${performance.converted} converted`}
          icon={Users}
          tone="slate"
          href={`/dashboard/leads?assigned=${rep.id}`}
        />
        <StatCard
          label="Calls this week"
          value={performance.callsThisWeek}
          hint={`${performance.callsToday} today`}
          icon={PhoneCall}
          tone="orange"
          href="/dashboard/analytics#rep-performance"
        />
        <StatCard
          label="Connect rate"
          value={`${connectRate}%`}
          hint={`${performance.connectedCallsThisWeek} of ${performance.callsThisWeek} calls connected`}
          icon={UserCheck}
          tone="sky"
          href="/dashboard/analytics#rep-performance"
        />
        <StatCard
          label="Unique leads called"
          value={performance.uniqueLeadsCalledThisWeek}
          hint="Distinct leads this week"
          icon={Target}
          tone="violet"
          href="/dashboard/analytics#rep-performance"
        />
        <StatCard
          label="Developer meetings"
          value={performance.meetings}
          hint="Currently in meeting stage"
          icon={CalendarClock}
          tone="violet"
          href={`/dashboard/leads?assigned=${rep.id}&status=MEETING`}
        />
        <StatCard
          label="Proposals sent"
          value={performance.proposals}
          hint="Currently in proposal stage"
          icon={ArrowUpRight}
          tone="amber"
          href={`/dashboard/leads?assigned=${rep.id}&status=PROPOSAL`}
        />
        <StatCard
          label="Converted"
          value={performance.converted}
          hint={`${performance.conversionRate}% conversion rate`}
          icon={Target}
          tone="orange"
          href={`/dashboard/leads?assigned=${rep.id}&status=CONVERTED`}
        />
        <StatCard
          label="Follow-ups due"
          value={performance.followUpsToday}
          hint={`${performance.followUpsOverdue} overdue`}
          icon={CalendarClock}
          tone="rose"
          href={`/dashboard/leads?assigned=${rep.id}&status=FOLLOW_UP`}
        />
        <StatCard
          label="Payments collected"
          value={formatCurrency(performance.paymentsCollected)}
          hint="Actually received on this rep's leads"
          icon={Wallet}
          tone="emerald"
          href={`/dashboard/leads?assigned=${rep.id}&payment=PARTIAL`}
        />
        <StatCard
          label="Incentive earned"
          value={
            performance.incentiveEnabled
              ? formatCurrency(performance.incentivesEarned)
              : "Fixed salary"
          }
          hint={
            performance.incentiveEnabled
              ? `${performance.incentiveRate}% of collected payments`
              : "No incentive configured by the super admin"
          }
          icon={IndianRupee}
          tone="orange"
          href={`/dashboard/leads?assigned=${rep.id}&payment=PAID`}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <CallTrendChart points={callTrend} />

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            Coaching signals
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Manual changes are stage moves made without logging a call.
          </p>
          <div className="mt-4 divide-y divide-slate-200">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                <MousePointerClick className="h-3.5 w-3.5 text-sky-500" />
                Manual stage changes
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {performance.manualStageChangesThisWeek}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                Contacted without a call
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {performance.contactedWithoutCall}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                Stale leads (7+ days)
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {performance.staleLeads}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                <PhoneCall className="h-3.5 w-3.5 text-orange-500" />
                Last call activity
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {lastActivityLabel(performance.lastActivityAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent calls
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Last {recentCalls.length} logged call
              {recentCalls.length === 1 ? "" : "s"}.
            </p>
          </div>
          {recentCalls.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">
              No calls logged yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead className="border-b border-slate-200 bg-slate-50/70">
                  <tr>
                    <th className="table-head">Lead</th>
                    <th className="table-head">Outcome</th>
                    <th className="table-head text-right">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recentCalls.map((call) => {
                    const connected = (
                      CONNECTED_CALL_RESULTS as readonly string[]
                    ).includes(call.resultStatus);

                    return (
                      <tr key={call.id}>
                        <td className="table-cell font-medium text-slate-800">
                          {call.businessName}
                        </td>
                        <td className="table-cell">
                          <span
                            className={cn(
                              "badge",
                              connected
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-600",
                            )}
                          >
                            {call.resultStatus}
                          </span>
                        </td>
                        <td className="table-cell text-right text-xs text-slate-500">
                          {formatDate(call.calledAt, true)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Needs attention
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Open leads with no call in the last 7 days.
            </p>
          </div>
          {attentionLeads.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">
              Every open lead was called in the last 7 days. Nice work.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="border-b border-slate-200 bg-slate-50/70">
                  <tr>
                    <th className="table-head">Lead</th>
                    <th className="table-head">Status</th>
                    <th className="table-head text-right">Last call</th>
                    <th className="table-head text-right">Calls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {attentionLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="table-cell font-medium text-slate-800">
                        {lead.businessName}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="table-cell text-right text-xs text-slate-500">
                        {lead.lastCalledAt
                          ? `${lead.daysSinceCall} days ago`
                          : "Never called"}
                      </td>
                      <td className="table-cell text-right">
                        {lead.callCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Recent stage changes
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Manual entries are status moves made without logging a call.
          </p>
        </div>
        {recentStageChanges.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">
            No stage changes recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="border-b border-slate-200 bg-slate-50/70">
                <tr>
                  <th className="table-head">Lead</th>
                  <th className="table-head">Change</th>
                  <th className="table-head">Source</th>
                  <th className="table-head text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentStageChanges.map((change) => (
                  <tr key={change.id}>
                    <td className="table-cell font-medium text-slate-800">
                      {change.businessName}
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={change.from} />
                        <span className="text-xs text-slate-400">→</span>
                        <StatusBadge status={change.to} />
                      </div>
                    </td>
                    <td className="table-cell">
                      <span
                        className={cn(
                          "badge",
                          change.source === "manual"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-sky-200 bg-sky-50 text-sky-700",
                        )}
                      >
                        {change.source === "manual" ? "Manual" : "Call"}
                      </span>
                    </td>
                    <td className="table-cell text-right text-xs text-slate-500">
                      {formatDate(change.changedAt, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Recent payments
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Payments credited to this rep for incentive calculation.
          </p>
        </div>
        {recentPayments.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">
            No payments recorded on this rep&apos;s leads yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-slate-200 bg-slate-50/70">
                <tr>
                  <th className="table-head">Lead</th>
                  <th className="table-head">Mode</th>
                  <th className="table-head text-right">Amount</th>
                  <th className="table-head text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="table-cell font-medium text-slate-800">
                      <Link
                        href={`/dashboard/leads?assigned=${rep.id}`}
                        className="hover:text-orange-700"
                      >
                        {payment.businessName}
                      </Link>
                    </td>
                    <td className="table-cell text-xs text-slate-500">
                      {payment.mode}
                    </td>
                    <td className="table-cell text-right font-medium text-emerald-700">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="table-cell text-right text-xs text-slate-500">
                      {formatDate(payment.paidAt, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
