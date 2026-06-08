import { useState } from "react";
import { AlertTriangle, Timer, Route, X, ChevronDown, ChevronUp, History } from "lucide-react";
import { useRouteFallbackLog } from "@/hooks/useRouteFallbackLog";
import { acknowledgeRouteFallbackEntry, clearRouteFallbackLog } from "@/lib/routeFallbackLog";

function fmtMin(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60); const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
function fmtMiles(m: number) {
  const mi = m / 1609.344;
  return `${mi.toFixed(mi >= 10 ? 0 : 1)} mi`;
}
function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); }
  catch { return iso; }
}
function fmtRel(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 60000;
  if (d < 1) return "just now";
  if (d < 60) return `${Math.round(d)}m ago`;
  const h = d / 60; if (h < 24) return `${Math.round(h)}h ago`;
  return new Date(iso).toLocaleDateString();
}

/** Persistent banner + collapsible log of times we fell back to an approximate route. */
export default function RouteFallbackBanner() {
  const entries = useRouteFallbackLog();
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;
  const latest = entries[0];
  const unacked = entries.filter((e) => !e.acknowledged).length;

  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/10 overflow-hidden">
      <div className="p-4 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-bold text-warning uppercase tracking-wider">Fallback route in use</p>
            {unacked > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-warning text-warning-foreground text-[10px] font-bold">
                {unacked} new
              </span>
            )}
          </div>
          <p className="text-[11px] text-foreground/80 leading-relaxed mt-1">
            Google Maps routing was unavailable. We estimated your route, distance and ETA using a straight-line approximation
            {latest.fallbackReason ? ` (${latest.fallbackReason})` : ""}. Navigation still opens turn-by-turn directions normally.
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
              <Timer className="w-3.5 h-3.5 text-warning" /> ETA <strong className="font-bold">{fmtTime(latest.etaIso)}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
              <Route className="w-3.5 h-3.5 text-warning" /> {fmtMin(latest.durationSec)} · {fmtMiles(latest.distanceMeters)}
            </span>
            <span className="text-[11px] text-muted-foreground ml-auto">{fmtRel(latest.occurredAt)}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-2 border-t border-warning/30 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-warning hover:bg-warning/10"
      >
        <History className="w-3 h-3" />
        {open ? "Hide history" : `View history (${entries.length})`}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="border-t border-warning/30 max-h-72 overflow-y-auto">
          <ul className="divide-y divide-warning/20">
            {entries.map((e) => (
              <li key={e.id} className="px-4 py-3 flex items-start gap-2">
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${e.acknowledged ? "bg-muted-foreground/40" : "bg-warning"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">ETA {fmtTime(e.etaIso)} · {fmtMin(e.durationSec)}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{fmtRel(e.occurredAt)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {e.stopCount} stop{e.stopCount === 1 ? "" : "s"} · {fmtMiles(e.distanceMeters)}
                    {e.fallbackReason ? ` · ${e.fallbackReason}` : ""}
                  </p>
                </div>
                {!e.acknowledged && (
                  <button
                    type="button"
                    onClick={() => acknowledgeRouteFallbackEntry(e.id)}
                    className="text-[10px] uppercase tracking-wider text-warning hover:underline shrink-0"
                  >
                    Mark seen
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="px-4 py-2 border-t border-warning/30 flex justify-end">
            <button
              type="button"
              onClick={() => clearRouteFallbackLog()}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear log
            </button>
          </div>
        </div>
      )}
    </div>
  );
}