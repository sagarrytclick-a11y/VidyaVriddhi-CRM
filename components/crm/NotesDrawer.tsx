"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  IndianRupee,
  MapPin,
  MessageSquareText,
  MousePointerClick,
  Pencil,
  Phone,
  Plus,
  Send,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import { Modal, SlideOver } from "@/components/crm/Modal";
import { DealValueModal } from "@/components/crm/DealValueModal";
import { PaymentModal } from "@/components/crm/PaymentModal";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { addNoteAction, deletePaymentAction } from "@/lib/actions/leads";
import {
  PAYMENT_ELIGIBLE_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
} from "@/lib/constants";
import type { LeadPaymentView, LeadStatus, LeadView, SessionUser } from "@/lib/types";
import {
  cn,
  formatCurrency,
  formatDate,
  formatPhoneNumber,
  relativeDate,
} from "@/lib/utils";

type TimelineItem =
  | {
      type: "note";
      id: string;
      at: string;
      author: string;
      text: string;
    }
  | {
      type: "call";
      id: string;
      at: string;
      author: string;
      text: string;
    }
  | {
      type: "status";
      id: string;
      at: string;
      author: string;
      from: LeadStatus;
      to: LeadStatus;
      source: "manual" | "call";
    }
  | {
      type: "payment";
      id: string;
      at: string;
      author: string;
      amount: number;
      mode: string;
    };

export function NotesDrawer({
  lead,
  user,
  open,
  onClose,
  onSaved,
}: {
  lead: LeadView | null;
  user: SessionUser;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeadPaymentView | null>(
    null,
  );
  const [deletePending, startDelete] = useTransition();
  const [paymentError, setPaymentError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead || !comment.trim()) return;

    setError("");

    startTransition(async () => {
      const result = await addNoteAction({
        leadId: lead.id,
        comment,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setComment("");
      onSaved(result.message ?? "Note added.");
    });
  }

  function confirmDeletePayment() {
    if (!lead || !deleteTarget) return;

    setPaymentError("");

    startDelete(async () => {
      const result = await deletePaymentAction(lead.id, deleteTarget.id);

      if (!result.ok) {
        setPaymentError(result.error);
        return;
      }

      setDeleteTarget(null);
      onSaved(result.message ?? "Payment removed.");
    });
  }

  if (!lead) return null;

  const timeline: TimelineItem[] = [
    ...lead.notes.map((note) => ({
      type: "note" as const,
      id: `note-${note.id}`,
      at: note.createdAt,
      author: note.createdBy.name,
      text: note.comment,
    })),
    ...lead.callLogs.map((call) => ({
      type: "call" as const,
      id: `call-${call.id}`,
      at: call.calledAt,
      author: call.calledBy.name,
      text: call.resultStatus,
    })),
    ...lead.statusHistory.map((change) => ({
      type: "status" as const,
      id: `status-${change.id}`,
      at: change.changedAt,
      author: change.changedBy.name,
      from: change.from,
      to: change.to,
      source: change.source,
    })),
    ...lead.payments.map((payment) => ({
      type: "payment" as const,
      id: `payment-${payment.id}`,
      at: payment.paidAt,
      author: payment.recordedBy.name,
      amount: payment.amount,
      mode: payment.mode,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const isAdmin = user.role !== "SALES_EXEC";
  const canRecordPayment = (
    PAYMENT_ELIGIBLE_STATUSES as readonly LeadStatus[]
  ).includes(lead.status);
  const canAddPayment =
    canRecordPayment && Boolean(lead.dealValue) && lead.amountDue > 0;
  const paidPercent = lead.dealValue
    ? Math.min(100, Math.round((lead.amountPaid / lead.dealValue) * 100))
    : 0;

  return (
    <>
      <SlideOver
        open={open}
        onClose={onClose}
        title={lead.businessName}
        description="Conversation history and notes"
      >
        <div className="space-y-6 px-5 py-5 sm:px-6">
        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            {formatPhoneNumber(lead.phoneNumber)}
          </div>
          {lead.cityState ? (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {lead.cityState}
            </div>
          ) : null}
          {lead.category ? (
            <div className="flex items-center gap-2 text-slate-600">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {lead.category}
              </span>
            </div>
          ) : null}
          {lead.followUpDate ? (
            <div className="flex items-center gap-2 text-slate-600">
              <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
              Follow up {relativeDate(lead.followUpDate).toLowerCase()}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Wallet className="h-3.5 w-3.5" />
                Deal &amp; payments
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {lead.dealValue
                  ? `${formatCurrency(lead.amountPaid)} received of ${formatCurrency(lead.dealValue)}`
                  : "Total deal amount is not set yet."}
              </p>
            </div>
            <span
              className={cn(
                "badge shrink-0",
                PAYMENT_STATUS_STYLES[lead.paymentStatus],
              )}
            >
              {PAYMENT_STATUS_LABELS[lead.paymentStatus]}
            </span>
          </div>

          {lead.dealValue ? (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Total
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {formatCurrency(lead.dealValue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Received
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-emerald-700">
                    {formatCurrency(lead.amountPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Due
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-amber-700">
                    {formatCurrency(lead.amountDue)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </>
          ) : null}

          {lead.payments.length > 0 ? (
            <div className="mt-3 space-y-2">
              {lead.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {formatCurrency(payment.amount)}
                      <span className="text-xs font-normal text-slate-500">
                        {" "}
                        · {payment.mode}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatDate(payment.paidAt)} · by{" "}
                      {payment.recordedBy.name}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </p>
                    {payment.note ? (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {payment.note}
                      </p>
                    ) : null}
                  </div>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(payment)}
                      className="icon-btn shrink-0 text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                      title="Remove payment"
                      aria-label={`Remove payment of ${formatCurrency(payment.amount)}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setDealOpen(true)}
                disabled={!canRecordPayment}
                className="btn-secondary h-8 px-3 text-xs"
                title={
                  canRecordPayment
                    ? "Set or edit the total deal amount"
                    : "Available after the meeting stage"
                }
              >
                <Pencil className="h-3.5 w-3.5" />
                {lead.dealValue ? "Edit total" : "Set total amount"}
              </button>
            ) : null}
            {canAddPayment ? (
              <button
                type="button"
                onClick={() => setPaymentOpen(true)}
                className="btn-primary h-8 px-3 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add payment
              </button>
            ) : null}
          </div>

          {!canRecordPayment ? (
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Payments open after the developer meeting (Meeting, Proposal, or
              Converted stage).
            </p>
          ) : !lead.dealValue ? (
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              {isAdmin
                ? "Set the total deal amount before recording the first payment."
                : "Your admin needs to set the total deal amount before a payment can be recorded."}
            </p>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label htmlFor="new-note" className="label">
            Add a note
          </label>
          <div className="relative">
            <MessageSquareText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <textarea
              id="new-note"
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={2000}
              placeholder="Context for the next conversation…"
              className="textarea pl-9"
            />
          </div>
          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending || !comment.trim()}
              className="btn-primary h-9 px-3.5"
            >
              <Send className="h-3.5 w-3.5" />
              {pending ? "Saving…" : "Save note"}
            </button>
          </div>
        </form>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Activity
            </h3>
            <span className="text-xs text-slate-400">
              {timeline.length} item{timeline.length === 1 ? "" : "s"}
            </span>
          </div>

          {timeline.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              No activity yet. Log a call or add the first note.
            </div>
          ) : (
            <ol className="space-y-3">
              {timeline.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                      {item.type === "call" ? (
                        <Phone className="h-3.5 w-3.5 text-orange-600" />
                      ) : item.type === "status" ? (
                        item.source === "manual" ? (
                          <MousePointerClick className="h-3.5 w-3.5 text-amber-600" />
                        ) : (
                          <ArrowRight className="h-3.5 w-3.5 text-sky-600" />
                        )
                      ) : item.type === "payment" ? (
                        <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <MessageSquareText className="h-3.5 w-3.5 text-sky-600" />
                      )}
                      {item.type === "call"
                        ? item.text
                        : item.type === "status"
                          ? "Stage changed"
                          : item.type === "payment"
                            ? `Payment received · ${formatCurrency(item.amount)}`
                            : item.author}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(item.at, true)}
                    </span>
                  </div>
                  {item.type === "status" ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={item.from} />
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <StatusBadge status={item.to} />
                      <span className="ml-1 text-xs text-slate-500">
                        by {item.author} ·{" "}
                        {item.source === "manual" ? "manual" : "from a call"}
                      </span>
                    </div>
                  ) : item.type === "payment" ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {formatCurrency(item.amount)} via {item.mode} · recorded by{" "}
                      {item.author}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.type === "call"
                        ? `Call logged by ${item.author}`
                        : item.text}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
        </div>
      </SlideOver>

      {paymentOpen ? (
        <PaymentModal
          key={`payment-${lead.id}`}
          lead={lead}
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          onSaved={onSaved}
        />
      ) : null}

      {dealOpen ? (
        <DealValueModal
          key={`deal-${lead.id}`}
          lead={lead}
          open={dealOpen}
          onClose={() => setDealOpen(false)}
          onSaved={onSaved}
        />
      ) : null}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove this payment?"
        description={
          deleteTarget
            ? `${formatCurrency(deleteTarget.amount)} received on ${formatDate(deleteTarget.paidAt)}. This also reduces the rep's incentive.`
            : undefined
        }
        size="sm"
      >
        {paymentError ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {paymentError}
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDeletePayment}
            disabled={deletePending}
            className="btn-primary bg-rose-600 hover:bg-rose-700"
          >
            <Trash2 className="h-4 w-4" />
            {deletePending ? "Removing…" : "Remove payment"}
          </button>
        </div>
      </Modal>
    </>
  );
}
