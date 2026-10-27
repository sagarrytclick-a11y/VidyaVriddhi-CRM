import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  Clock,
  MousePointerClick,
  PhoneCall,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import { AnalyticsSummary } from "@/components/crm/AnalyticsSummary";
import { PageHeader } from "@/components/crm/PageHeader";
import { RepPerformanceTable } from "@/components/crm/RepPerformanceTable";
import { StatCard } from "@/components/crm/StatCard";
import { requireAdmin } from "@/lib/auth/session";
import { getAnalytics } from "@/lib/data/analytics";

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage() {
  await requireAdmin();
  const analytics = await getAnalytics();

  const bestConverter = [...analytics.reps]
    .filter((rep) => rep.converted > 0)
    .sort((a, b) => b.conversionRate - a.conversionRate)[0];
  const mostCalls = [...analytics.reps]
    .filter((rep) => rep.callsThisWeek > 0)
    .sort((a, b) => b.callsThisWeek - a.callsThisWeek)[0];
  const teamConversion = analytics.conversionRate;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Activity, call quality, stage progress, and coaching signals for the current week."
        actions={
          <>
            <Link href="/dashboard/team" className="btn-secondary">
              Manage team
            </Link>
            <Link href="/dashboard/leads" className="btn-primary">
              Work leads
            </Link>
          </>
        }
      />

      <AnalyticsSummary data={analytics} />

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Stale leads"
          value={analytics.staleLeads}
          hint="Open leads with no call in 7+ days"
          icon={Clock}
          tone="amber"
          href="/dashboard/leads"
        />
        <StatCard
          label="Contacted without a call"
          value={analytics.contactedWithoutCall}
          hint="Advanced stage, zero call logs"
          icon={ShieldAlert}
          tone="rose"
          href="/dashboard/leads?status=CONTACTED"
        />
        <StatCard
          label="Manual stage changes"
          value={analytics.manualStageChangesThisWeek}
          hint="This week, without a logged call"
          icon={MousePointerClick}
          tone="sky"
          href="/dashboard/analytics#rep-performance"
        />
        <StatCard
          label="Follow-ups due"
          value={analytics.followUpsToday}
          hint={`${analytics.followUpsThisWeek} due this week`}
          icon={CalendarClock}
          tone="violet"
          href="/dashboard/today"
        />
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link
          href={
            bestConverter
              ? `/dashboard/team/${bestConverter.id}`
              : "#rep-performance"
          }
          className="card block p-5 transition hover:-translate-y-0.5 hover:border-orange-300/70 hover:bg-slate-100/70"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Best conversion rate
            </p>
            <Target className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            {bestConverter?.name ?? "—"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {bestConverter
              ? `${bestConverter.conversionRate}% · ${bestConverter.converted} converted`
              : "No conversions yet"}
          </p>
        </Link>
        <Link
          href={
            mostCalls ? `/dashboard/team/${mostCalls.id}` : "#rep-performance"
          }
          className="card block p-5 transition hover:-translate-y-0.5 hover:border-orange-300/70 hover:bg-slate-100/70"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Most calls this week
            </p>
            <PhoneCall className="h-4 w-4 text-orange-500" />
          </div>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            {mostCalls?.name ?? "—"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {mostCalls
              ? `${mostCalls.callsThisWeek} calls · ${mostCalls.connectedCallsThisWeek} connected`
              : "No calls yet"}
          </p>
        </Link>
        <Link
          href="/dashboard/leads?status=CONVERTED"
          className="card block p-5 transition hover:-translate-y-0.5 hover:border-orange-300/70 hover:bg-slate-100/70"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Team conversion
            </p>
            <TrendingUp className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            {teamConversion}%
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {analytics.convertedLeads} of {analytics.totalLeads} leads converted
          </p>
        </Link>
      </div>

      <section id="rep-performance" className="mt-8 scroll-mt-6">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              Sales rep performance
            </h2>
            <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
              Calls and stage changes are for the current week (Mon–Sun).
              Connect rate counts only outcomes where the rep actually spoke to
              someone. Manual stage changes are status moves made without
              logging a call.
            </p>
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-slate-400 sm:inline-flex">
            <BarChart3 className="h-3.5 w-3.5" />
            Updated{" "}
            {new Date().toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="card overflow-hidden">
          <RepPerformanceTable reps={analytics.reps} />
        </div>
      </section>
    </>
  );
}
