const DAY_MS = 86_400_000;

/** Formats an amount in minor units, respecting zero-decimal currencies like JPY. */
export function formatMoney(amountMinor: number, currency: string, locale = "en-US"): string {
  const code = currency.toUpperCase();
  const digits = new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
  return new Intl.NumberFormat(locale, { style: "currency", currency: code }).format(amountMinor / 10 ** digits);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function daysUntil(iso: string, from: string): number {
  return Math.ceil((Date.parse(iso) - Date.parse(from)) / DAY_MS);
}

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export const LANGUAGE_NAMES: Record<string, string> = {
  de: "German",
  "pt-BR": "Portuguese (Brazil)",
  ja: "Japanese",
  fr: "French",
  en: "English",
};
