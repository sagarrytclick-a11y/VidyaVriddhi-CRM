"use client";

import { useState, useTransition, type FormEvent } from "react";
import { AlertCircle, IndianRupee, Wallet } from "lucide-react";
import { Modal } from "@/components/crm/Modal";
import { recordPaymentAction } from "@/lib/actions/leads";
import { PAYMENT_MODES } from "@/lib/constants";
import type { LeadView, PaymentMode } from "@/lib/types";
import { formatCurrency, toDateInputValue } from "@/lib/utils";

export function PaymentModal({
  lead,
  open,
  onClose,
  onSaved,
}: {
  lead: LeadView | null;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [mode, setMode] = useState<PaymentMode>("UPI");
  const [amount, setAmount] = useState(String(lead?.amountDue ?? ""));
  const [paidAt, setPaidAt] = useState(toDateInputValue(new Date().toISOString()));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;

    setError("");

    startTransition(async () => {
      const result = await recordPaymentAction({
        leadId: lead.id,
        amount,
        paidAt,
        mode,
        reference,
        note,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onSaved(result.message ?? "Payment recorded.");
      onClose();
    });
  }

  if (!lead) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a payment"
      description={`${lead.businessName} · ${formatCurrency(lead.amountPaid)} received of ${formatCurrency(lead.dealValue)}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
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

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="payment-amount" className="label">
              Amount received
            </label>
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                id="payment-amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                min="1"
                max={lead.amountDue}
                step="0.01"
                required
                className="input pl-8"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Defaults to the full pending amount. Change it for a 30% advance.
            </p>
          </div>

          <div>
            <label htmlFor="payment-date" className="label">
              Payment date
            </label>
            <input
              id="payment-date"
              type="date"
              value={paidAt}
              max={toDateInputValue(new Date().toISOString())}
              onChange={(event) => setPaidAt(event.target.value)}
              required
              className="input"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="payment-mode" className="label">
              Mode
            </label>
            <select
              id="payment-mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as PaymentMode)}
              className="input"
            >
              {PAYMENT_MODES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="payment-reference" className="label">
              Reference (optional)
            </label>
            <input
              id="payment-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              maxLength={120}
              placeholder="UPI / cheque / txn no."
              className="input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="payment-note" className="label">
            Note (optional)
          </label>
          <textarea
            id="payment-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="30% advance received after the developer meeting."
            className="textarea"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            <Wallet className="h-4 w-4" />
            {pending ? "Saving…" : "Save payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
