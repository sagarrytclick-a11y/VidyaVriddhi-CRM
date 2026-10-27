import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "slate",
  href,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "slate" | "orange" | "amber" | "sky" | "violet" | "rose" | "emerald";
  href?: string;
  className?: string;
}) {
  const tones = {
    slate: "bg-slate-200 text-slate-400",
    orange: "bg-orange-50 text-orange-400",
    amber: "bg-amber-50 text-amber-400",
    sky: "bg-sky-50 text-sky-400",
    violet: "bg-violet-50 text-violet-400",
    rose: "bg-rose-50 text-rose-400",
    emerald: "bg-emerald-50 text-emerald-500",
  };

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            tones[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <div className="mt-1 flex min-h-4 items-center justify-between gap-2">
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : <span />}
        {href ? (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-400 transition group-hover:text-orange-600">
            Open
            <ArrowUpRight className="h-3 w-3" />
          </span>
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "card group block p-5 transition hover:-translate-y-0.5 hover:border-orange-300/70 hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn("card p-5", className)}>{content}</div>;
}
