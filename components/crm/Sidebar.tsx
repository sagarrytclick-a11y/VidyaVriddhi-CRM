"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import {
  BarChart3,
  CalendarCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  UsersRound,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/crm/Logo";
import { Modal } from "@/components/crm/Modal";
import { logoutAction } from "@/lib/actions/auth";
import { ROLE_LABELS } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const adminNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/today", label: "Today's follow-ups", icon: CalendarCheck2 },
  { href: "/dashboard/leads", label: "All leads", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/team", label: "Team", icon: UsersRound },
];

const execNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/today", label: "Today's follow-ups", icon: CalendarCheck2 },
  { href: "/dashboard/leads", label: "My leads", icon: Users },
];

export default function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const navigation = user.role === "SALES_EXEC" ? execNav : adminNav;

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // First submit only opens the confirmation dialog; the actual
    // submission happens once the user confirms in the dialog.
    if (confirmedRef.current) {
      confirmedRef.current = false;
      setLoggingOut(true);
      return;
    }
    event.preventDefault();
    setConfirmOpen(true);
  }

  function handleConfirmLogout() {
    confirmedRef.current = true;
    setLoggingOut(true);
    formRef.current?.requestSubmit();
  }

  const navContent = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="icon-btn lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Workspace
        </p>
        {navigation.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-orange-50 text-orange-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4",
                  active ? "text-orange-600" : "text-slate-400",
                )}
              />
              {item.label}
              {item.href === "/dashboard/today" && (
                <span className="ml-auto rounded-full bg-slate-300 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-300">
                  Daily
                </span>
              )}
            </Link>
          );
        })}

        <div className="my-4 border-t border-slate-200" />
        <div className="rounded-2xl bg-slate-50 p-3.5">
          <p className="text-xs font-medium text-slate-700">Quick tip</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Log every call outcome. The daily queue and analytics stay useful
            only when the activity is recorded.
          </p>
        </div>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-semibold text-white">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
          <form ref={formRef} action={logoutAction} onSubmit={handleSubmit}>
            <button
              type="submit"
              className="icon-btn h-8 w-8"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-slate-100/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="icon-btn"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-slate-200 bg-slate-100 lg:flex">
        {navContent}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-label="Close navigation overlay"
          />
          <aside className="animate-slide-in relative flex h-full w-[280px] flex-col bg-slate-100 shadow-2xl">
            {navContent}
          </aside>
        </div>
      ) : null}

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!loggingOut) setConfirmOpen(false);
        }}
        title="Log out of Vidya Vriddhi?"
        description="Are you sure you want to sign out?"
        size="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={loggingOut}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={handleConfirmLogout}
              disabled={loggingOut}
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Logging out…" : "Yes, log out"}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-slate-600">
          You will be returned to the sign-in screen. Calls, notes, and lead
          updates are already saved, so nothing is lost.
        </p>
      </Modal>
    </>
  );
}
