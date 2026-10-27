"use client";

import { useOptimistic, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { assignLeadAction } from "@/lib/actions/leads";
import type { ActionResult, LeadUserRef, UserOption } from "@/lib/types";

export function AssignSelect({
  leadId,
  assignedTo,
  reps,
  onResult,
}: {
  leadId: string;
  assignedTo: LeadUserRef | null;
  reps: UserOption[];
  onResult: (result: ActionResult) => void;
}) {
  const [value, setOptimisticValue] = useOptimistic(
    assignedTo?.id ?? "",
    (_current: string, next: string) => next,
  );
  const [pending, startTransition] = useTransition();

  function handleChange(nextValue: string) {
    startTransition(async () => {
      setOptimisticValue(nextValue);
      const result = await assignLeadAction(leadId, nextValue || null);
      onResult(result);
    });
  }

  return (
    <div className="relative inline-flex max-w-[170px]">
      <select
        aria-label="Assign lead"
        value={value}
        disabled={pending}
        onChange={(event) => handleChange(event.target.value)}
        className="h-8 w-full appearance-none truncate rounded-lg border border-slate-200 bg-slate-50 py-0 pl-2.5 pr-7 text-xs font-medium text-slate-600 outline-none transition hover:border-slate-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60"
      >
        <option value="">Unassigned</option>
        {reps.map((rep) => (
          <option key={rep.id} value={rep.id}>
            {rep.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
