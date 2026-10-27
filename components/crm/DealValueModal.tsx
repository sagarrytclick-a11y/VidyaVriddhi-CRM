"use client";

import { useState, useTransition, type FormEvent } from "react";
import { AlertCircle, IndianRupee, Save } from "lucide-react";
import { Modal } from "@/components/crm/Modal";
import { setDealValueAction } from "@/lib/actions/leads";
import type { LeadView } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function DealValueModal({
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
  const [value, setValue] = useState(String(lead?.dealValue ?? ""));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;

    setError("");

    startTransition(async () => {
      const result = await setDealValueAction({
        leadId: lead.id,
        dealValue: value,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onSaved(result.message ?? "Deal amount saved.");
      onClose();
    });
  }

  if (!lead) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set total deal amount"
      description={`${lead.businessName} · ${formatCurrency(lead.amountPaid)} already received`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <div>
          <label htmlFor="deal-value" className="label">
            Total deal value
          </label>
          <div className="relative">
            <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              id="deal-value"
              type="number"
              min={Math.max(lead.amountPaid, 1)}
              step="0.01"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              required
              className="input pl-8"
            />
          </div>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">
            This is the final contract value. You can reduce it later only if
            the amount already received stays covered.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            <Save className="h-4 w-4" />
            {pending ? "Saving…" : "Save amount"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
