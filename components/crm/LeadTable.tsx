"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  MapPin,
  PhoneCall,
  SearchX,
  StickyNote,
  Tag,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { AssignSelect } from "@/components/crm/AssignSelect";
import { EmptyState } from "@/components/crm/EmptyState";
import { Modal } from "@/components/crm/Modal";
import { NotesDrawer } from "@/components/crm/NotesDrawer";
import { QuickCallModal } from "@/components/crm/QuickCallModal";
import { StatusSelect } from "@/components/crm/StatusSelect";
import { WhatsAppIcon } from "@/components/crm/WhatsAppIcon";
import { WhatsAppModal } from "@/components/crm/WhatsAppModal";
import { assignAllLeadsAction, bulkAssignLeadsAction } from "@/lib/actions/leads";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_STYLES } from "@/lib/constants";
import type {
  ActionResult,
  LeadView,
  SessionUser,
  UserOption,
} from "@/lib/types";
import {
  cn,
  dialerHref,
  formatCurrency,
  formatPhoneNumber,
  isOverdue,
  relativeDate,
} from "@/lib/utils";

interface ToastState {
  ok: boolean;
  message: string;
}

export interface LeadTableAssignAll {
  /** Number of leads matching the current filters (server-side count). */
  total: number;
  filters: {
    q?: string;
    status?: string;
    assigned?: string;
    category?: string;
    payment?: string;
  };
}

export function LeadTable({
  leads,
  user,
  reps,
  assignAll,
}: {
  leads: LeadView[];
  user: SessionUser;
  reps: UserOption[];
  assignAll?: LeadTableAssignAll;
}) {
  const router = useRouter();
  const isAdmin = user.role !== "SALES_EXEC";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRep, setBulkRep] = useState("");
  const [bulkPending, startBulk] = useTransition();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [callLeadId, setCallLeadId] = useState<string | null>(null);
  const [notesLeadId, setNotesLeadId] = useState<string | null>(null);
  const [whatsappLeadId, setWhatsappLeadId] = useState<string | null>(null);
  const [assignAllOpen, setAssignAllOpen] = useState(false);
  const [assignAllMode, setAssignAllMode] = useState<"single" | "split">(
    "split",
  );
  const [assignAllRep, setAssignAllRep] = useState("");
  const [assignAllPending, startAssignAll] = useTransition();

  const callLead = useMemo(
    () => leads.find((lead) => lead.id === callLeadId) ?? null,
    [callLeadId, leads],
  );
  const notesLead = useMemo(
    () => leads.find((lead) => lead.id === notesLeadId) ?? null,
    [leads, notesLeadId],
  );
  const whatsappLead = useMemo(
    () => leads.find((lead) => lead.id === whatsappLeadId) ?? null,
    [leads, whatsappLeadId],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedIds = useMemo(
    () => Array.from(selected).filter((id) => leads.some((lead) => lead.id === id)),
    [leads, selected],
  );

  function handleResult(result: ActionResult) {
    setToast({
      ok: result.ok,
      message: result.ok
        ? (result.message ?? "Saved.")
        : result.error,
    });

    if (result.ok) router.refresh();
  }

  function toggleLead(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = leads.length > 0 && selectedIds.length === leads.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((lead) => lead.id)));
  }

  function applyBulkAssignment() {
    if (selectedIds.length === 0) return;

    startBulk(async () => {
      const result = await bulkAssignLeadsAction(
        selectedIds,
        bulkRep || null,
      );

      handleResult(result);

      if (result.ok) {
        setSelected(new Set());
        setBulkRep("");
      }
    });
  }

  function applyAssignAll() {
    if (!assignAll) return;

    startAssignAll(async () => {
      const result = await assignAllLeadsAction({
        mode: assignAllMode,
        repId: assignAllMode === "single" ? assignAllRep || null : null,
        q: assignAll.filters.q || null,
        status: assignAll.filters.status || null,
        assigned: assignAll.filters.assigned || null,
        category: assignAll.filters.category || null,
        payment: assignAll.filters.payment || null,
      });

      handleResult(result);

      if (result.ok) {
        setAssignAllOpen(false);
        setSelected(new Set());
      }
    });
  }

  function startCall(lead: LeadView) {
    setCallLeadId(lead.id);
    window.location.href = dialerHref(lead.phoneNumber);
  }

  return (
    <>
      <div className="card overflow-hidden">
        {isAdmin && assignAll && assignAll.total > 0 ? (
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">
                {assignAll.total.toLocaleString()}
              </span>{" "}
              lead{assignAll.total === 1 ? "" : "s"} match the current filters
            </p>
            <button
              type="button"
              onClick={() => setAssignAllOpen(true)}
              className="btn-secondary h-8 self-start px-3 text-xs sm:self-auto"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Assign all…
            </button>
          </div>
        ) : null}
        {isAdmin && selectedIds.length > 0 ? (
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-orange-50/50 px-4 py-3 sm:flex-row sm:items-center">
            <p className="text-sm font-medium text-orange-900">
              {selectedIds.length} selected
            </p>
            <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
              <div className="relative">
                <select
                  value={bulkRep}
                  onChange={(event) => setBulkRep(event.target.value)}
                  className="input h-9 min-w-[180px] pr-8 text-xs"
                  aria-label="Assign selected leads to"
                >
                  <option value="">Unassigned</option>
                  {reps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
              <button
                type="button"
                onClick={applyBulkAssignment}
                disabled={bulkPending}
                className="btn-primary h-9 px-3.5"
              >
                <Users className="h-3.5 w-3.5" />
                {bulkPending ? "Assigning…" : "Apply"}
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="btn-ghost h-9 px-3"
              >
                Clear
              </button>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse">
            <thead className="border-b border-slate-200 bg-slate-50/70">
              <tr>
                {isAdmin ? (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all leads"
                      className="h-4 w-4 rounded border-slate-300 text-orange-600 accent-orange-600"
                    />
                  </th>
                ) : null}
                <th className="table-head">Business</th>
                <th className="table-head">Phone</th>
                <th className="table-head">
                  {isAdmin ? "Assigned rep" : "Owner"}
                </th>
                <th className="table-head">Status</th>
                <th className="table-head">Follow-up</th>
                <th className="table-head">Deal / payment</th>
                <th className="table-head text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7}>
                    <EmptyState
                      icon={SearchX}
                      title="No leads found"
                      description="Try changing your filters, or import a fresh batch of leads."
                    />
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={cn(
                      "transition hover:bg-slate-50/60",
                      selected.has(lead.id) && "bg-orange-50/40",
                    )}
                  >
                    {isAdmin ? (
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selected.has(lead.id)}
                          onChange={() => toggleLead(lead.id)}
                          aria-label={`Select ${lead.businessName}`}
                          className="h-4 w-4 rounded border-slate-300 accent-orange-600"
                        />
                      </td>
                    ) : null}
                    <td className="table-cell">
                      <div className="min-w-[190px]">
                        <p className="font-medium text-slate-900">
                          {lead.businessName}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                          {lead.cityState ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {lead.cityState}
                            </span>
                          ) : (
                            <span>
                              Added {relativeDate(lead.createdAt).toLowerCase()}
                            </span>
                          )}
                          {lead.category ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                              <Tag className="h-2.5 w-2.5" />
                              {lead.category}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell whitespace-nowrap">
                      {formatPhoneNumber(lead.phoneNumber)}
                    </td>
                    <td className="table-cell">
                      {isAdmin ? (
                        <AssignSelect
                          leadId={lead.id}
                          assignedTo={lead.assignedTo}
                          reps={reps}
                          onResult={handleResult}
                        />
                      ) : (
                        <span className="text-xs font-medium text-slate-700">
                          {lead.assignedTo?.name ?? "You"}
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <StatusSelect
                        leadId={lead.id}
                        status={lead.status}
                        onResult={handleResult}
                      />
                    </td>
                    <td className="table-cell whitespace-nowrap">
                      {lead.followUpDate ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium",
                            isOverdue(lead.followUpDate)
                              ? "text-rose-600"
                              : "text-slate-600",
                          )}
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                          {relativeDate(lead.followUpDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="table-cell whitespace-nowrap">
                      {lead.dealValue ? (
                        <div>
                          <p className="text-xs font-medium text-slate-800">
                            {formatCurrency(lead.amountPaid)}
                            <span className="text-slate-400">
                              {" "}
                              / {formatCurrency(lead.dealValue)}
                            </span>
                          </p>
                          <span
                            className={cn(
                              "badge mt-1 text-[10px]",
                              PAYMENT_STATUS_STYLES[lead.paymentStatus],
                            )}
                          >
                            {PAYMENT_STATUS_LABELS[lead.paymentStatus]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => startCall(lead)}
                          className="icon-btn text-orange-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                          title={`Call ${formatPhoneNumber(lead.phoneNumber)}`}
                          aria-label={`Call ${lead.businessName}`}
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWhatsappLeadId(lead.id)}
                          className="icon-btn text-[#25D366] hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-300"
                          title="Send WhatsApp"
                          aria-label={`WhatsApp ${lead.businessName}`}
                        >
                          <WhatsAppIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotesLeadId(lead.id)}
                          className="icon-btn"
                          title="Notes and activity"
                          aria-label={`Notes for ${lead.businessName}`}
                        >
                          <StickyNote className="h-3.5 w-3.5" />
                          {lead.notes.length > 0 ? (
                            <span className="sr-only">
                              {lead.notes.length} notes
                            </span>
                          ) : null}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QuickCallModal
        key={callLead?.id ?? "no-call"}
        lead={callLead}
        open={Boolean(callLead)}
        onClose={() => setCallLeadId(null)}
        onLogged={(message) => {
          setToast({ ok: true, message });
          router.refresh();
        }}
      />

      <NotesDrawer
        lead={notesLead}
        user={user}
        open={Boolean(notesLead)}
        onClose={() => setNotesLeadId(null)}
        onSaved={(message) => {
          setToast({ ok: true, message });
          router.refresh();
        }}
      />

      <WhatsAppModal
        key={whatsappLead?.id ?? "no-whatsapp"}
        lead={whatsappLead}
        repName={user.name}
        open={Boolean(whatsappLead)}
        onClose={() => setWhatsappLeadId(null)}
      />

      <Modal
        open={assignAllOpen}
        onClose={() => {
          if (!assignAllPending) setAssignAllOpen(false);
        }}
        title="Assign all matching leads"
        description={
          assignAll
            ? `You're about to assign ${assignAll.total.toLocaleString()} lead${assignAll.total === 1 ? "" : "s"} — every lead that matches the filters you've set.`
            : undefined
        }
        size="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setAssignAllOpen(false)}
              disabled={assignAllPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={applyAssignAll}
              disabled={
                assignAllPending ||
                (assignAllMode === "single" && !assignAllRep)
              }
            >
              <UserPlus className="h-4 w-4" />
              {assignAllPending
                ? "Assigning…"
                : assignAllMode === "split"
                  ? `Split ${assignAll?.total.toLocaleString() ?? ""} leads`
                  : `Assign ${assignAll?.total.toLocaleString() ?? ""} leads`}
            </button>
          </div>
        }
      >
        <div className="space-y-2.5">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 transition hover:border-slate-300">
            <input
              type="radio"
              name="assignAllMode"
              checked={assignAllMode === "split"}
              onChange={() => setAssignAllMode("split")}
              className="mt-0.5 h-4 w-4 accent-orange-600"
            />
            <span>
              <span className="block text-sm font-medium text-slate-700">
                Split evenly across all active reps
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                Every active sales executive gets roughly the same number,
                weighted toward whoever currently has the lightest workload.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3 transition hover:border-slate-300">
            <input
              type="radio"
              name="assignAllMode"
              checked={assignAllMode === "single"}
              onChange={() => setAssignAllMode("single")}
              className="mt-0.5 h-4 w-4 accent-orange-600"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-700">
                Assign to one rep
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                Give every matching lead to a single sales executive.
              </span>
              {assignAllMode === "single" ? (
                <span className="mt-2.5 block">
                  <select
                    value={assignAllRep}
                    onChange={(event) => setAssignAllRep(event.target.value)}
                    className="input h-9 w-full text-sm"
                    aria-label="Assign all matching leads to"
                  >
                    <option value="">Choose a rep…</option>
                    {reps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name}
                      </option>
                    ))}
                  </select>
                </span>
              ) : null}
            </span>
          </label>

          <p className="text-xs leading-5 text-slate-500">
            This applies to the filtered list, not just this page — all{" "}
            {assignAll?.total.toLocaleString() ?? ""} matching leads are
            updated, no matter how many pages there are.
          </p>
        </div>
      </Modal>

      {toast ? (
        <div
          className={cn(
            "animate-fade-in fixed bottom-5 right-5 z-[80] flex max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg",
            toast.ok
              ? "border-emerald-200 bg-slate-100 text-emerald-800"
              : "border-rose-200 bg-slate-100 text-rose-700",
          )}
          role="status"
        >
          {toast.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          )}
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
