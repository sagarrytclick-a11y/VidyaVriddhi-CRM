import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ImportLeadsModal } from "@/components/crm/ImportLeadsModal";
import { LeadFilters } from "@/components/crm/LeadFilters";
import { LeadTable } from "@/components/crm/LeadTable";
import { PageHeader } from "@/components/crm/PageHeader";
import { requireUser } from "@/lib/auth/session";
import { LEAD_STATUSES, PAGE_SIZE, PAYMENT_STATUSES } from "@/lib/constants";
import { listLeads, listLeadCategories } from "@/lib/data/leads";
import { listActiveSalesReps } from "@/lib/data/users";
import type { LeadStatus, PaymentStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Leads",
};

interface LeadsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    assigned?: string;
    category?: string;
    source?: string;
    payment?: string;
    page?: string;
  }>;
}

function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function buildHref(
  filters: {
    q?: string;
    status?: string;
    assigned?: string;
    category?: string;
    source?: string;
    payment?: string;
  },
  page: number,
): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.assigned) params.set("assigned", filters.assigned);
  if (filters.category) params.set("category", filters.category);
  if (filters.source) params.set("source", filters.source);
  if (filters.payment) params.set("payment", filters.payment);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/dashboard/leads?${query}` : "/dashboard/leads";
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const isAdmin = user.role !== "SALES_EXEC";

  const q = params.q?.trim().slice(0, 120);
  const status = LEAD_STATUSES.includes(params.status as LeadStatus)
    ? (params.status as LeadStatus)
    : undefined;
  const assigned = isAdmin ? params.assigned : undefined;
  const category = params.category?.trim().slice(0, 100) || undefined;
  const source = params.source?.trim().slice(0, 60) || undefined;
  const payment = PAYMENT_STATUSES.includes(params.payment as PaymentStatus)
    ? (params.payment as PaymentStatus)
    : undefined;
  const page = parsePage(params.page);

  const [result, reps, categories] = await Promise.all([
    listLeads(user, {
      q,
      status,
      assigned,
      category,
      source,
      payment,
      page,
      pageSize: PAGE_SIZE,
    }),
    isAdmin ? listActiveSalesReps() : Promise.resolve([]),
    listLeadCategories(user),
  ]);

  const from = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.page * result.pageSize, result.total);

  return (
    <>
      <PageHeader
        title={isAdmin ? "All leads" : "My leads"}
        description={
          isAdmin
            ? "Search, assign, and work the full pipeline. Use the status control for instant updates."
            : "Every lead assigned to you. Log calls, send WhatsApp messages, and keep follow-ups current."
        }
        actions={
          isAdmin ? (
            <>
              <Link
                href="/dashboard/leads?assigned=unassigned"
                className="btn-secondary"
              >
                Unassigned
              </Link>
              <ImportLeadsModal />
            </>
          ) : (
            <Link href="/dashboard/today" className="btn-secondary">
              Today&apos;s queue
            </Link>
          )
        }
      />

      <LeadFilters
        q={q}
        status={status}
        assigned={assigned}
        category={category}
        categories={categories}
        source={source}
        payment={payment}
        reps={reps}
        showAssigned={isAdmin}
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-700">{from}</span>–
          <span className="font-medium text-slate-700">{to}</span> of{" "}
          <span className="font-medium text-slate-700">{result.total}</span>{" "}
          leads
        </p>
        {!isAdmin ? (
          <span className="badge border-orange-200 bg-orange-50 text-orange-700">
            Assigned to you
          </span>
        ) : null}
      </div>

      <LeadTable
        leads={result.leads}
        user={user}
        reps={reps}
        assignAll={
          isAdmin
            ? {
                total: result.total,
                filters: { q, status, assigned, category, source, payment },
              }
            : undefined
        }
      />

      {result.totalPages > 1 ? (
        <nav
          className="mt-5 flex items-center justify-between"
          aria-label="Lead pages"
        >
          <p className="text-xs text-slate-500">
            Page {result.page} of {result.totalPages}
          </p>
          <div className="flex items-center gap-2">
            {result.page > 1 ? (
              <Link
                href={buildHref(
                  { q, status, assigned, category, source, payment },
                  result.page - 1,
                )}
                className="btn-secondary h-9 px-3"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            ) : (
              <span className="btn-secondary h-9 cursor-not-allowed px-3 opacity-50">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </span>
            )}
            {result.page < result.totalPages ? (
              <Link
                href={buildHref(
                  { q, status, assigned, category, source, payment },
                  result.page + 1,
                )}
                className="btn-secondary h-9 px-3"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="btn-secondary h-9 cursor-not-allowed px-3 opacity-50">
                Next
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </nav>
      ) : null}
    </>
  );
}
