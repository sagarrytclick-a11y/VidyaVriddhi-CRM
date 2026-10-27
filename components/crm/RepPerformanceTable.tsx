import Link from "next/link";
import { ArrowUpRight, PhoneCall, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/crm/EmptyState";
import type { RepPerformance } from "@/lib/types";
import { cn, formatCurrency, initials } from "@/lib/utils";

function connectRate(rep: RepPerformance): number {
  if (rep.callsThisWeek === 0) return 0;
  return Math.round((rep.connectedCallsThisWeek / rep.callsThisWeek) * 100);
}

function lastSeen(value: string | null): string {
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
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function RepPerformanceTable({ reps }: { reps: RepPerformance[] }) {
  if (reps.length === 0) {
    return (
      <EmptyState
        icon={PhoneCall}
        title="No sales reps yet"
        description="Create a sales rep account from the Team page to start tracking activity."
      />
    );
  }

  const ranked = [...reps].sort(
    (a, b) => b.callsThisWeek - a.callsThisWeek || b.converted - a.converted,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1380px]">
        <thead className="border-b border-slate-200 bg-slate-50/70">
          <tr>
            <th className="table-head">Sales rep</th>
            <th className="table-head text-right">Leads</th>
            <th className="table-head text-right">Calls (week)</th>
            <th className="table-head text-right">Connected</th>
            <th className="table-head text-right">Unique leads</th>
            <th className="table-head text-right">Meetings</th>
            <th className="table-head text-right">Proposals</th>
            <th className="table-head text-right">Converted</th>
            <th className="table-head text-right">Conv. rate</th>
            <th className="table-head text-right">Collected</th>
            <th className="table-head text-right">Incentive</th>
            <th className="table-head">Coaching flags</th>
            <th className="table-head text-right">Last activity</th>
            <th className="table-head text-right">Detail</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {ranked.map((rep) => {
            const rate = connectRate(rep);

            return (
              <tr key={rep.id} className="transition hover:bg-slate-50/60">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                      {initials(rep.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {rep.name}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        @{rep.username}
                        {!rep.isActive ? " · inactive" : ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="table-cell text-right font-medium text-slate-900">
                  {rep.leadsAssigned}
                </td>
                <td className="table-cell text-right">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                    {rep.callsToday > 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-orange-600" />
                    ) : null}
                    {rep.callsThisWeek}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    {rep.callsToday} today
                  </p>
                </td>
                <td className="table-cell text-right">
                  <span className="font-medium text-slate-900">
                    {rep.connectedCallsThisWeek}
                  </span>
                  <p className="text-[11px] text-slate-400">{rate}% connect</p>
                </td>
                <td className="table-cell text-right">
                  {rep.uniqueLeadsCalledThisWeek}
                </td>
                <td className="table-cell text-right">{rep.meetings}</td>
                <td className="table-cell text-right">{rep.proposals}</td>
                <td className="table-cell text-right font-medium text-slate-900">
                  {rep.converted}
                </td>
                <td className="table-cell text-right">
                  <div className="inline-flex items-center gap-2">
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-orange-500"
                        style={{
                          width: `${Math.min(100, rep.conversionRate)}%`,
                        }}
                      />
                    </div>
                    <span className="w-9 text-right text-xs font-medium text-slate-700">
                      {rep.conversionRate}%
                    </span>
                  </div>
                </td>
                <td className="table-cell text-right">
                  <span className="font-medium text-slate-900">
                    {formatCurrency(rep.paymentsCollected)}
                  </span>
                  <p className="text-[11px] text-slate-400">payments</p>
                </td>
                <td className="table-cell text-right">
                  {rep.incentiveEnabled ? (
                    <>
                      <span className="font-medium text-emerald-700">
                        {formatCurrency(rep.incentivesEarned)}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {rep.incentiveRate}% rate
                      </p>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Fixed salary
                    </span>
                  )}
                </td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-1">
                    {rep.manualStageChangesThisWeek > 0 ? (
                      <span
                        className="badge border-amber-200 bg-amber-50 text-amber-700"
                        title="Stage changes made this week without logging a call"
                      >
                        {rep.manualStageChangesThisWeek} manual
                      </span>
                    ) : null}
                    {rep.contactedWithoutCall > 0 ? (
                      <span
                        className="badge border-rose-200 bg-rose-50 text-rose-700"
                        title="Leads in an advanced stage with zero call logs"
                      >
                        <ShieldAlert className="h-3 w-3" />
                        {rep.contactedWithoutCall} no-call
                      </span>
                    ) : null}
                    {rep.staleLeads > 0 ? (
                      <span
                        className="badge border-slate-200 bg-slate-50 text-slate-600"
                        title="Open leads with no call in the last 7 days"
                      >
                        {rep.staleLeads} stale
                      </span>
                    ) : null}
                    {rep.manualStageChangesThisWeek === 0 &&
                    rep.contactedWithoutCall === 0 &&
                    rep.staleLeads === 0 ? (
                      <span className="text-xs text-slate-400">Clean</span>
                    ) : null}
                  </div>
                </td>
                <td className="table-cell text-right text-xs text-slate-500">
                  {lastSeen(rep.lastActivityAt)}
                </td>
                <td className="table-cell text-right">
                  <Link
                    href={`/dashboard/team/${rep.id}`}
                    className={cn("icon-btn", "hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600")}
                    title={`View ${rep.name}'s performance`}
                    aria-label={`View ${rep.name}'s performance`}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
