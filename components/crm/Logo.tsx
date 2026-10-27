import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  className,
  href = "/dashboard",
}: {
  compact?: boolean;
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 text-slate-900",
        className,
      )}
    >
      <Image
        src="/logo.png"
        alt="Vidya Vriddhi logo"
        width={32}
        height={32}
        priority
        className="h-9 w-9 shrink-0"
      />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight">
            Vidya Vriddhi
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
            Sales CRM
          </span>
        </span>
      )}
    </Link>
  );
}
