const LOCALE = "ro-RO";

export function formatMoney(cents: number | null | undefined, currency = "EUR", opts?: { compact?: boolean }) {
  if (cents == null) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: opts?.compact ? "compact" : "standard",
  }).format(cents / 100);
}

/** Valoare pentru input de formular (fără simbol valutar). */
export function centsToInput(cents: number | null | undefined) {
  if (cents == null) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export function formatNumber(n: number | null | undefined, suffix = "") {
  if (n == null) return "—";
  return new Intl.NumberFormat(LOCALE).format(n) + suffix;
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
}

export function formatStockNumber(n: number) {
  return `AF-${String(n).padStart(5, "0")}`;
}

export function monthLabel(isoMonth: string) {
  const [y, m] = isoMonth.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE, { month: "short" }).format(new Date(y, m - 1, 1)).replace(".", "");
}
