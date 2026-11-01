const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "02 Oct 2026 08:14 UTC": fixed format, no locale or time-zone dependence (no hydration drift). */
export function formatUtc(iso: string, withTime = true): string {
  const d = new Date(iso);
  const date = `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  if (!withTime) return date;
  return `${date} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

export function money(minor: number, currency: string) {
  return `${currency.toUpperCase()} ${(minor / 100).toFixed(2)}`;
}
