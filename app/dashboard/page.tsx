import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  IndianRupee,
  PhoneCall,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { AnalyticsSummary } from "@/components/crm/AnalyticsSummary";
import { ImportLeadsModal } from "@/components/crm/ImportLeadsModal";
import { LeadTable } from "@/components/crm/LeadTable";
import { PageHeader } from "@/components/crm/PageHeader";
import { RepPerformanceTable } from "@/components/crm/RepPerformanceTable";
import { StatCard } from "@/components/crm/StatCard";
import { requireUser } from "@/lib/auth/session";
import { getAnalytics, getPersonalAnalytics } from "@/lib/data/analytics";
import { listLeads } from "@/lib/data/leads";
import { listActiveSalesReps } from "@/lib/data/users";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name.split(" ")[0];

  if (user.role === "SALES_EXEC") {
    const [analytics, dueLeads, recentLeads] = await Promise.all([
      getPersonalAnalytics(user),
      listLeads(user, { due: "due", pageSize: 6, sort: "followup" }),
      listLeads(user, { pageSize: 5 }),
    ]);

    return (
      <>
        <PageHeader
          title={`Welcome, ${firstName}`}
          description="Here is your day at a glance. Start with the follow-ups that need you most."
          actions={
            <Link href="/dashboard/today" className="btn-primary">
              Open today&apos;s queue
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="My leads"
            value={analytics.totalLeads}
            hint={`${analytics.convertedLeads} converted`}
            icon={Users}
            tone="slate"
            href="/dashboard/leads"
          />
          <StatCard
            label="Calls today"
            value={analytics.callsToday}
            hint={`${analytics.callsThisWeek} this week`}
            icon={PhoneCall}
            tone="orange"
            href="/dashboard/leads"
          />
          <StatCard
            label="Follow-ups due"
            value={analytics.followUpsToday}
            hint={`${analytics.followUpsThisWeek} due this week`}
            icon={CalendarCheck2}
            tone="amber"
            href="/dashboard/today"
          />
          <StatCard
            label="Conversion rate"
            value={`${analytics.conversionRate}%`}
            hint="Across your assigned leads"
            icon={Target}
            tone="violet"
            href="/dashboard/leads?status=CONVERTED"
          />
          <StatCard
            label="Payments collected"
            value={formatCurrency(analytics.paymentsCollected)}
            hint="From your assigned leads"
            icon={Wallet}
            tone="emerald"
            href="/dashboard/leads?payment=PARTIAL"
          />
          <StatCard
            label="My incentive"
            value={
              analytics.incentiveEnabled
                ? formatCurrency(analytics.incentivesEarned)
                : "Fixed salary"
            }
            hint={
              analytics.incentiveEnabled
                ? `${analytics.incentiveRate}% of collected payments`
                : "No incentive configured by the super admin"
            }
            icon={IndianRupee}
            tone="orange"
            href="/dashboard/leads?payment=PAID"
          />
        </div>

        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                Today&apos;s follow-ups
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Due today or overdue. Call, log, and move the conversation
                forward.
              </p>
            </div>
            <Link
              href="/dashboard/today"
              className="hidden text-xs font-medium text-orange-700 hover:text-orange-800 sm:inline-flex"
            >
              View all
            </Link>
          </div>
          <LeadTable leads={dueLeads.leads} user={user} reps={[]} />
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                Recently updated
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                The last five leads you touched.
              </p>
            </div>
            <Link
              href="/dashboard/leads"
              className="text-xs font-medium text-orange-700 hover:text-orange-800"
            >
              All my leads
            </Link>
          </div>
          <LeadTable leads={recentLeads.leads} user={user} reps={[]} />
        </section>
      </>
    );
  }

  const [analytics, recentLeads, reps] = await Promise.all([
    getAnalytics(),
    listLeads(user, { pageSize: 6 }),
    listActiveSalesReps(),
  ]);

  const topReps = [...analytics.reps]
    .sort((a, b) => b.callsToday - a.callsToday || b.converted - a.converted)
    .slice(0, 4);

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="A live view of the pipeline, today's activity, and where the team should focus next."
        actions={
          <>
            <Link href="/dashboard/analytics" className="btn-secondary">
              Full analytics
            </Link>
            <ImportLeadsModal />
          </>
        }
      />

      <AnalyticsSummary data={analytics} />

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                Recent leads
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                The latest updates across the organization.
              </p>
            </div>
            <Link
              href="/dashboard/leads"
              className="text-xs font-medium text-orange-700 hover:text-orange-800"
            >
              View all leads
            </Link>
          </div>
          <LeadTable leads={recentLeads.leads} user={user} reps={reps} />
        </section>

        <aside className="min-w-0 space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Today&apos;s queue
              </h2>
              <span className="badge border-amber-200 bg-amber-50 text-amber-700">
                {analytics.followUpsToday} due
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Keep the team focused on callbacks and warm conversations.
            </p>
            <Link
              href="/dashboard/today"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 hover:text-orange-800"
            >
              Open team queue
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Most active today
              </h2>
              <PhoneCall className="h-4 w-4 text-slate-400" />
            </div>
            <div className="divide-y divide-slate-200">
              {topReps.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">
                  No sales reps yet.
                </p>
              ) : (
                topReps.map((rep) => (
                  <Link
                    key={rep.id}
                    href={`/dashboard/team/${rep.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-100/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {rep.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {rep.leadsAssigned} leads assigned
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {rep.callsToday}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">
                        calls
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <h2 className="text-sm font-semibold text-orange-900">
              Pipeline hygiene
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-orange-800">
              {analytics.unassignedLeads > 0
                ? `${analytics.unassignedLeads} leads are unassigned. Distribute them before they go cold.`
                : "Every lead has an owner. Nice work."}
            </p>
            <Link
              href="/dashboard/leads?assigned=unassigned"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-orange-800 hover:text-orange-900"
            >
              Review unassigned
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </div>

      <section className="mt-8">
        <div className="mb-3">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            Rep performance
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Calls and conversions for the current week.
          </p>
        </div>
        <div className="card overflow-hidden">
          <RepPerformanceTable reps={analytics.reps} />
        </div>
      </section>
    </>
  );
}
