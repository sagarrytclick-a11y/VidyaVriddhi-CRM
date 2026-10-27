import { Activity, IndianRupee, PhoneCall, Target, Users, Wallet } from "lucide-react";
import { StatCard } from "@/components/crm/StatCard";
import type { AnalyticsData } from "@/lib/types";
import { formatCurrency, percentage } from "@/lib/utils";

export function AnalyticsSummary({ data }: { data: AnalyticsData }) {
  const callBreakdown = data.reps
    .filter((rep) => rep.callsThisWeek > 0)
    .sort((a, b) => b.callsThisWeek - a.callsThisWeek)
    .slice(0, 3)
    .map((rep) => `${rep.name.split(" ")[0]} ${rep.callsThisWeek}`)
    .join(" · ");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total leads"
          value={data.totalLeads.toLocaleString()}
          hint={`${data.unassignedLeads.toLocaleString()} unassigned`}
          icon={Users}
          tone="slate"
          href="/dashboard/leads"
        />
        <StatCard
          label="Calls this week"
          value={data.callsThisWeek.toLocaleString()}
          hint={callBreakdown || "No calls logged yet"}
          icon={PhoneCall}
          tone="orange"
          href="/dashboard/analytics#rep-performance"
        />
        <StatCard
          label="Connect rate"
          value={`${percentage(data.connectedCallsThisWeek, data.callsThisWeek)}%`}
          hint={`${data.connectedCallsThisWeek.toLocaleString()} of ${data.callsThisWeek.toLocaleString()} calls connected`}
          icon={Activity}
          tone="sky"
          href="/dashboard/analytics#rep-performance"
        />
        <StatCard
          label="Converted ratio"
          value={`${data.conversionRate}%`}
          hint={`${data.convertedLeads.toLocaleString()} converted leads`}
          icon={Target}
          tone="violet"
          href="/dashboard/leads?status=CONVERTED"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Payments collected"
          value={formatCurrency(data.paymentsCollected)}
          hint="Actually received, not just booked"
          icon={Wallet}
          tone="emerald"
          href="/dashboard/leads?payment=PARTIAL"
        />
        <StatCard
          label="Amount pending"
          value={formatCurrency(data.paymentsPending)}
          hint="Due on deals with a set value"
          icon={IndianRupee}
          tone="amber"
          href="/dashboard/leads?payment=PARTIAL"
        />
        <StatCard
          label="Total deal value"
          value={formatCurrency(data.totalDealValue)}
          hint="Sum of finalised deal amounts"
          icon={Target}
          tone="sky"
          href="/dashboard/leads?payment=PAID"
        />
        <StatCard
          label="Rep incentives"
          value={formatCurrency(data.incentivesEarned)}
          hint="Collected payments × each rep's rate"
          icon={Activity}
          tone="orange"
          href="/dashboard/analytics#rep-performance"
        />
      </div>
    </div>
  );
}
