import { STATUS_LABELS, STATUS_STYLES } from "@/lib/constants";
import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  return (
    <span className={cn("badge", STATUS_STYLES[status], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status]}
    </span>
  );
}
