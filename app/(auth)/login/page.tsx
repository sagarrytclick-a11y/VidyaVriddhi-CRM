import type { Metadata } from "next";
import LoginForm from "@/components/crm/LoginForm";
import { Logo } from "@/components/crm/Logo";

export const metadata: Metadata = {
  title: "Sign in",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/dashboard")
    ? params.next
    : undefined;

  return (
    <div className="w-full max-w-sm">
      <div className="card p-7 sm:p-8">
        <div className="mb-7">
          <Logo href="/login" />
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Sign in
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Use the account your admin created for you.
        </p>

        <div className="mt-6">
          <LoginForm nextPath={nextPath} />
        </div>
      </div>
    </div>
  );
}
