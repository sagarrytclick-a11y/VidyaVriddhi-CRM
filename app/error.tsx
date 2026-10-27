"use client";

import { useEffect } from "react";
import { DatabaseZap, RefreshCw } from "lucide-react";

function looksLikeDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|server selection|MongoNetworkError|MongooseServerSelectionError/i.test(
    `${error.name} ${error.message}`,
  );
}

export default function AppError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const databaseDown = looksLikeDatabaseError(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-slate-100 p-8 shadow-sm">
        <span className="flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <DatabaseZap className="size-6" aria-hidden />
        </span>

        <h1 className="mt-5 text-xl font-semibold text-slate-900">
          {databaseDown ? "Database unavailable" : "Something went wrong"}
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          {databaseDown
            ? "The CRM cannot reach MongoDB. Start the local database with `npm run db` (or point MONGODB_URI at your MongoDB/Atlas cluster), then try again."
            : "An unexpected error stopped this page from loading. You can retry, or head back to the dashboard."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="btn-primary"
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </button>
          <a
            href="/dashboard"
            className="btn-secondary"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
