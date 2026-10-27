"use client";

import { useEffect } from "react";
import { DatabaseZap, RefreshCw } from "lucide-react";

function looksLikeDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|server selection|MongoNetworkError|MongooseServerSelectionError/i.test(
    `${error.name} ${error.message}`,
  );
}

export default function DashboardError({
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
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-8 shadow-sm">
      <span className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
        <DatabaseZap className="size-5" aria-hidden />
      </span>

      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        {databaseDown ? "Database unavailable" : "This page could not load"}
      </h2>

      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {databaseDown
          ? "The CRM cannot reach MongoDB. Start the local database with `npm run db` (or point MONGODB_URI at your MongoDB/Atlas cluster), then try again."
          : "An unexpected error stopped this page from loading. Retry to fetch the latest data."}
      </p>

      <button
        type="button"
        onClick={() => retry()}
        className="btn-primary mt-5"
      >
        <RefreshCw className="size-4" aria-hidden />
        Try again
      </button>
    </div>
  );
}
