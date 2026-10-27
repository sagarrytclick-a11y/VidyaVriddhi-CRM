"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  AlertCircle,
  CalendarDays,
  MessageSquareText,
  PhoneCall,
} from "lucide-react";
import { Modal } from "@/components/crm/Modal";
import { logCallAction } from "@/lib/actions/leads";
import {
  CALL_RESULTS,
  LEAD_STATUSES,
  STATUS_LABELS,
} from "@/lib/constants";
import type { LeadStatus, LeadView } from "@/lib/types";
import {
  formatPhoneNumber,
  toDateInputValue,
} from "@/lib/utils";

export function QuickCallModal({
  lead,
  open,
  onClose,
  onLogged,
}: {
  lead: LeadView | null;
  open: boolean;
  onClose: () => void;
  onLogged: (message: string) => void;
}) {
  const [status, setStatus] = useState<LeadStatus>(
    lead?.status === "NEW" ? "CONTACTED" : (lead?.status ?? "CONTACTED"),
  );
  const [resultStatus, setResultStatus] = useState<string>("Connected");
  const [followUpDate, setFollowUpDate] = useState(
    toDateInputValue(lead?.followUpDate ?? null),
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;

    setError("");

    startTransition(async () => {
      const result = await logCallAction({
        leadId: lead.id,
        status,
        resultStatus,
        followUpDate: status === "FOLLOW_UP" ? followUpDate : null,
        note,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onLogged(result.message ?? "Call logged.");
      onClose();
    });
  }

  if (!lead) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log this call"
      description={`${lead.businessName} · ${formatPhoneNumber(lead.phoneNumber)}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-2.5 text-xs text-orange-700">
          <PhoneCall className="h-3.5 w-3.5" />
          The dialer was opened. Log the outcome below while it is fresh.
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="call-status" className="label">
              Lead status
            </label>
            <select
              id="call-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as LeadStatus)}
              className="input"
            >
              {LEAD_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="call-result" className="label">
              Call outcome
            </label>
            <select
              id="call-result"
              value={resultStatus}
              onChange={(event) => setResultStatus(event.target.value)}
              className="input"
            >
              {CALL_RESULTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {status === "FOLLOW_UP" ? (
          <div>
            <label htmlFor="follow-up-date" className="label">
              Next follow-up
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="follow-up-date"
                type="date"
                required
                value={followUpDate}
                onChange={(event) => setFollowUpDate(event.target.value)}
                className="input pl-9"
              />
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="call-note" className="label">
            Quick note{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <div className="relative">
            <MessageSquareText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <textarea
              id="call-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What did they say? What is the next step?"
              className="textarea pl-9"
              maxLength={2000}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Save call log"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
