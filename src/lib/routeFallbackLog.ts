const KEY = "route-fallback-log:v1";
const MAX_ENTRIES = 20;

export interface RouteFallbackEntry {
  id: string;
  occurredAt: string; // ISO
  etaIso: string;
  durationSec: number;
  distanceMeters: number;
  stopCount: number;
  fallbackReason?: string;
  acknowledged?: boolean;
}

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

export function subscribeRouteFallbackLog(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function getRouteFallbackLog(): RouteFallbackEntry[] {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RouteFallbackEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendRouteFallbackEntry(entry: Omit<RouteFallbackEntry, "id" | "occurredAt">) {
  const list = getRouteFallbackLog();
  const next: RouteFallbackEntry = {
    id: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    ...entry,
  };
  const updated = [next, ...list].slice(0, MAX_ENTRIES);
  try { window.localStorage.setItem(KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  emit();
  return next;
}

export function acknowledgeRouteFallbackEntry(id: string) {
  const list = getRouteFallbackLog().map((e) => (e.id === id ? { ...e, acknowledged: true } : e));
  try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
  emit();
}

export function clearRouteFallbackLog() {
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
  emit();
}