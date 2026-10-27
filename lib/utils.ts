import { clsx, type ClassValue } from "clsx";
import { DEFAULT_COUNTRY_CODE } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function normalizePhoneNumber(
  input: string,
  countryCode = DEFAULT_COUNTRY_CODE,
): string {
  let digits = input.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 10 && countryCode) {
    digits = `${countryCode}${digits}`;
  }

  return digits;
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  return phone.startsWith("+") ? phone : `+${digits}`;
}

export function dialerHref(phone: string): string {
  return `tel:+${phone.replace(/\D/g, "")}`;
}

export function whatsappHref(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppMessage(
  template: string,
  businessName: string,
  repName: string,
): string {
  return template
    .replaceAll("{{businessName}}", businessName)
    .replaceAll("{{repName}}", repName);
}

export function startOfDay(date = new Date()): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function endOfDay(date = new Date()): Date {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function startOfWeek(date = new Date()): Date {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = day === 0 ? 6 : day - 1;
  value.setDate(value.getDate() - diff);
  return value;
}

export function endOfWeek(date = new Date()): Date {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 6);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = dateOnly
    ? new Date(`${value}T12:00:00`)
    : new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toDateInputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(value: string | null, withTime = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime
      ? { hour: "2-digit", minute: "2-digit", hour12: true }
      : {}),
  }).format(date);
}

export function relativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const today = startOfDay();
  const target = startOfDay(date);
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < -1) return `${Math.abs(diff)} days overdue`;
  if (diff <= 7) return `In ${diff} days`;

  return formatDate(value);
}

export function isOverdue(value: string | null): boolean {
  if (!value) return false;
  return startOfDay(new Date(value)) < startOfDay();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function percentage(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function truncate(value: string, length = 60): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}…`;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}
