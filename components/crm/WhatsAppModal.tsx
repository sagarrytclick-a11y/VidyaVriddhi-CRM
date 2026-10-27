"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Modal } from "@/components/crm/Modal";
import { WhatsAppIcon } from "@/components/crm/WhatsAppIcon";
import {
  DEFAULT_WHATSAPP_TEMPLATE_ID,
  WHATSAPP_TEMPLATES,
} from "@/lib/constants";
import type { LeadView } from "@/lib/types";
import {
  buildWhatsAppMessage,
  formatPhoneNumber,
  whatsappHref,
} from "@/lib/utils";

export function WhatsAppModal({
  lead,
  repName,
  open,
  onClose,
}: {
  lead: LeadView | null;
  repName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [templateId, setTemplateId] = useState(DEFAULT_WHATSAPP_TEMPLATE_ID);

  const template = useMemo(
    () =>
      WHATSAPP_TEMPLATES.find((item) => item.id === templateId) ??
      WHATSAPP_TEMPLATES[0],
    [templateId],
  );

  if (!lead) return null;

  const message = buildWhatsAppMessage(
    template.body,
    lead.businessName,
    repName,
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send a WhatsApp"
      description={`${lead.businessName} · ${formatPhoneNumber(lead.phoneNumber)}`}
      size="md"
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {WHATSAPP_TEMPLATES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTemplateId(item.id)}
              className={`rounded-xl border p-3 text-left transition ${
                templateId === item.id
                  ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-500/10"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <span className="text-xs font-semibold text-slate-800">
                {item.label}
              </span>
              <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                {item.description}
              </span>
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="whatsapp-preview" className="label">
            Message preview
          </label>
          <textarea
            id="whatsapp-preview"
            readOnly
            rows={5}
            value={message}
            className="textarea bg-slate-50 text-slate-600"
          />
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-800">
          This opens WhatsApp with the message pre-filled. You can still edit it
          before sending.
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <a
            href={whatsappHref(lead.phoneNumber, message)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="btn-primary bg-[#128C7E] hover:bg-[#16a580]"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Open WhatsApp
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </div>
    </Modal>
  );
}
