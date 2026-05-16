/**
 * US-locale formatters used app-wide.
 * - Dates: MM/DD/YYYY
 * - Times: h:mm AM/PM (12-hour)
 */

/** "2025-05-16" -> "05/16/2025". Pass-through if invalid. */
export function formatDate(value?: string | Date | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? parseDateOnly(value) : value;
  if (!d || isNaN(d.getTime())) return String(value ?? "");
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

/** "2025-05-16" -> "May 16, 2025". */
export function formatDateLong(value?: string | Date | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? parseDateOnly(value) : value;
  if (!d || isNaN(d.getTime())) return String(value ?? "");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "14:30" or "14:30:00" -> "2:30 PM". Also accepts Date / ISO. */
export function formatTime(value?: string | Date | null): string {
  if (value == null || value === "") return "";
  // bare "HH:mm[:ss]"
  if (typeof value === "string" && /^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
    const [hStr, mStr] = value.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (!d || isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

/** ISO timestamp / Date -> "05/16/2025, 2:30 PM". */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (!d || isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Convenience for "date + time range". */
export function formatShiftRange(date?: string | null, start?: string | null, end?: string | null): string {
  const d = formatDate(date);
  const s = formatTime(start);
  const e = formatTime(end);
  return `${d}${d && (s || e) ? " · " : ""}${s}${s && e ? " – " : ""}${e}`;
}

function parseDateOnly(s: string): Date | null {
  // YYYY-MM-DD -> local Date (avoid TZ shift)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}