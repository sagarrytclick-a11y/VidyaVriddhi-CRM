import type { Metadata } from "next";
import Link from "next/link";
import {
  AlarmClock,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  PhoneCall,
} from "lucide-react";
import { EmptyState } from "@/components/crm/EmptyState";
import { LeadTable } from "@/components/crm/LeadTable";
import { PageHeader } from "@/components/crm/PageHeader";
import { StatCard } from "@/components/crm/StatCard";
import { requireUser } from "@/lib/auth/session";
import { getAnalytics, getPersonalAnalytics } from "@/lib/data/analytics";
import { listLeads } from "@/lib/data/leads";
import { listActiveSalesReps } from "@/lib/data/users";
import { isOverdue } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Today's follow-ups",
};

export default async function TodayPage() {
  const user = await requireUser();
  const isAdmin = user.role !== "SALES_EXEC";

  const [queue, analytics, reps] = await Promise.all([
    listLeads(user, { due: "due", pageSize: 100, sort: "followup" }),
    isAdmin ? getAnalytics() : getPersonalAnalytics(user),
    isAdmin ? listActiveSalesReps() : Promise.resolve([]),
  ]);

  const overdue = queue.leads.filter((lead) => isOverdue(lead.followUpDate)).length;
  const dueToday = queue.leads.length - overdue;

  return (
    <>
      <PageHeader
        title="Today's follow-ups"
        description={
          isAdmin
            ? "Every follow-up due today or overdue across the team, in priority order."
            : "Your callbacks and follow-ups, with the oldest first. Clear the overdue items first."
        }
        actions={
          <Link href="/dashboard/leads" className="btn-secondary">
            All leads
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Due queue"
          value={queue.leads.length}
          hint="Today and overdue"
          icon={CalendarCheck2}
          tone="amber"
        />
        <StatCard
          label="Due today"
          value={dueToday}
          hint="Scheduled for today"
          icon={CalendarDays}
          tone="orange"
        />
        <StatCard
          label="Overdue"
          value={overdue}
          hint={overdue > 0 ? "Clear these first" : "Nothing overdue"}
          icon={AlarmClock}
          tone={overdue > 0 ? "rose" : "slate"}
        />
        <StatCard
          label="Calls today"
          value={analytics.callsToday}
          hint={`${analytics.callsThisWeek} this week`}
          icon={PhoneCall}
          tone="sky"
        />
      </div>

      <div className="mt-6">
        {queue.leads.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={CheckCircle2}
              title="The queue is clear"
              description={
                isAdmin
                  ? "No follow-ups are due today. Check the leads page for new conversations."
                  : "You are all caught up for today. Add a follow-up date to a lead to build tomorrow's queue."
              }
              action={
                <Link href="/dashboard/leads" className="btn-primary">
                  Browse leads
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Sorted by the earliest follow-up date. Overdue leads are shown in
                red.
              </p>
              <span className="badge border-slate-200 bg-slate-100 text-slate-600">
                {queue.leads.length} in queue
              </span>
            </div>
            <LeadTable leads={queue.leads} user={user} reps={reps} />
          </>
        )}
      </div>
    </>
  );
}
