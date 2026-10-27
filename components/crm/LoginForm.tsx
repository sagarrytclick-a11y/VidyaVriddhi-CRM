"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight, LockKeyhole, User } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";

export default function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-5">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

      {state?.error ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div>
        <label htmlFor="identifier" className="label">
          Username
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder="username"
            className="input pl-9"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            placeholder="••••••••"
            className="input pl-9"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full"
      >
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <ArrowRight className="h-4 w-4" />}
      </button>

      <p className="text-center text-xs leading-5 text-slate-500">
        Accounts are created by your admin. Need access? Ask your team lead.
      </p>
    </form>
  );
}
