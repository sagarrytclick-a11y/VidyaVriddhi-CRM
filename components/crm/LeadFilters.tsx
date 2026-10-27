import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { LEAD_STATUSES, PAYMENT_STATUSES, PAYMENT_STATUS_LABELS, STATUS_LABELS } from "@/lib/constants";
import type { LeadStatus, PaymentStatus, UserOption } from "@/lib/types";

export function LeadFilters({
  q,
  status,
  assigned,
  category,
  categories,
  payment,
  reps,
  showAssigned,
}: {
  q?: string;
  status?: LeadStatus;
  assigned?: string;
  category?: string;
  categories: string[];
  payment?: PaymentStatus;
  reps: UserOption[];
  showAssigned: boolean;
}) {
  const hasFilters = Boolean(q || status || assigned || category || payment);
  const categoryOptions =
    category && !categories.includes(category)
      ? [category, ...categories]
      : categories;

  return (
    <form
      action="/dashboard/leads"
      method="get"
      className="card mb-4 flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center"
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search business, phone, or city…"
          className="input pl-9"
          aria-label="Search leads"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="input min-w-[145px] pl-8"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((option) => (
              <option key={option} value={option}>
                {STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        <select
          name="category"
          defaultValue={category ?? ""}
          className="input min-w-[150px]"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          name="payment"
          defaultValue={payment ?? ""}
          className="input min-w-[150px]"
          aria-label="Filter by payment status"
        >
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((option) => (
            <option key={option} value={option}>
              {PAYMENT_STATUS_LABELS[option]}
            </option>
          ))}
        </select>

        {showAssigned ? (
          <select
            name="assigned"
            defaultValue={assigned ?? ""}
            className="input min-w-[165px]"
            aria-label="Filter by assigned rep"
          >
            <option value="">All reps</option>
            <option value="unassigned">Unassigned</option>
            {reps.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.name}
              </option>
            ))}
          </select>
        ) : null}

        <button type="submit" className="btn-secondary">
          Apply
        </button>

        {hasFilters ? (
          <Link href="/dashboard/leads" className="btn-ghost">
            Reset
          </Link>
        ) : null}
      </div>
    </form>
  );
}
