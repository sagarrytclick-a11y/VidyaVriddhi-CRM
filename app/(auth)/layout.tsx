import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.1),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(16,185,129,0.06),transparent_30%)]" />
      <main className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        {children}
      </main>
    </div>
  );
}
