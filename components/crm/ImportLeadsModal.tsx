"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
  Upload,
} from "lucide-react";
import { Modal } from "@/components/crm/Modal";
import { importLeadsAction } from "@/lib/actions/leads";
import type { ImportActionState } from "@/lib/types";

const initialState: ImportActionState = { status: "idle" };

export function ImportLeadsModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    importLeadsAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success" && state.imported > 0) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary"
      >
        <Upload className="h-4 w-4" />
        Import leads
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Import leads"
        description="Paste scraped GMB/PDF text or upload a CSV. Duplicate phone numbers are skipped."
        size="lg"
      >
        <form action={formAction} className="space-y-4">
          {state.status === "error" ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {state.error}
            </div>
          ) : null}

          {state.status === "success" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {state.message}
              </div>
              <p className="mt-1 text-xs text-emerald-700">
                {state.imported} imported · {state.skipped} skipped ·{" "}
                {state.unassigned} unassigned
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
              <div className="text-xs leading-5 text-slate-600">
                <p className="font-medium text-slate-700">
                  Supported formats
                </p>
                <p>
                  CSV with <code className="rounded bg-slate-300 px-1">businessName</code>{" "}
                  and <code className="rounded bg-slate-300 px-1">phoneNumber</code>{" "}
                  columns, plus optional{" "}
                  <code className="rounded bg-slate-300 px-1">cityState</code> and{" "}
                  <code className="rounded bg-slate-300 px-1">category</code>.
                  Or one lead per line (name, phone, city, category). Headers
                  are optional.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="import-text" className="label">
              Paste raw text
            </label>
            <textarea
              id="import-text"
              name="rawText"
              rows={8}
              placeholder={"businessName,phoneNumber,cityState,category\nSharma Dental Clinic,9876543210,Jaipur,Clinic\nMetro Fitness | 9812345678 | Delhi | Gym"}
              className="textarea font-mono text-xs leading-6"
            />
          </div>

          <div>
            <label htmlFor="import-file" className="label">
              Or upload a CSV
            </label>
            <label
              htmlFor="import-file"
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition hover:border-orange-300 hover:bg-orange-50/30"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-700">
                  Choose a .csv or .txt file
                </span>
                <span className="block text-xs text-slate-500">
                  Up to 2 MB. For PDFs, copy the text and paste it above.
                </span>
              </span>
              <input
                id="import-file"
                name="file"
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="sr-only"
              />
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-3.5 py-3">
            <input
              type="checkbox"
              name="autoAssign"
              defaultChecked
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-orange-600"
            />
            <span>
              <span className="block text-sm font-medium text-slate-700">
                Auto-distribute evenly
              </span>
              <span className="block text-xs leading-5 text-slate-500">
                New leads go to the active sales reps with the lightest current
                load.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary"
            >
              Close
            </button>
            <button type="submit" disabled={pending} className="btn-primary">
              <Upload className="h-4 w-4" />
              {pending ? "Importing…" : "Import leads"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
