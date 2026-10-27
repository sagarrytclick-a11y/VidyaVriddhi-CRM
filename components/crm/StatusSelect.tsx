"use client";

import { useOptimistic, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { updateLeadStatusAction } from "@/lib/actions/leads";
import { LEAD_STATUSES, STATUS_LABELS, STATUS_STYLES } from "@/lib/constants";
import type { ActionResult, LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusSelect({
  leadId,
  status,
  onResult,
}: {
  leadId: string;
  status: LeadStatus;
  onResult: (result: ActionResult) => void;
}) {
  const [value, setOptimisticValue] = useOptimistic(
    status,
    (_current: LeadStatus, next: LeadStatus) => next,
  );
  const [pending, startTransition] = useTransition();

  function handleChange(nextStatus: LeadStatus) {
    startTransition(async () => {
      setOptimisticValue(nextStatus);
      const result = await updateLeadStatusAction(leadId, nextStatus);
      onResult(result);
    });
  }

  return (
    <div className="relative inline-flex">
      <select
        aria-label="Lead status"
        value={value}
        disabled={pending}
        onChange={(event) => handleChange(event.target.value as LeadStatus)}
        className={cn(
          "h-8 appearance-none rounded-lg border py-0 pl-2.5 pr-7 text-xs font-medium outline-none transition focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60",
          STATUS_STYLES[value],
        )}
      >
        {LEAD_STATUSES.map((option) => (
          <option key={option} value={option}>
            {STATUS_LABELS[option]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 opacity-60" />
    </div>
  );
}
