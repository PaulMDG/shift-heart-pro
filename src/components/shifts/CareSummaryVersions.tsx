import { useMemo, useState } from "react";
import { History, ChevronDown, ChevronRight, RotateCcw, Lock, Loader2 } from "lucide-react";
import { useCareSummaryVersions, useRestoreCareSummaryVersion, diffSnapshots, type CareSummaryVersion } from "@/hooks/useCareSummaryVersions";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/components/ui/sonner";

const LABELS: Record<string, string> = {
  meals_status: "Meals",
  medications_status: "Medications",
  medications_count: "Med count",
  hydration: "Hydration",
  bowel_movement: "Bowel",
  mobility_assisted: "Mobility",
  incident_severity: "Incident",
  incident_note: "Incident note",
  notes_text: "Notes",
  voice_url: "Voice note",
  photo_urls: "Photos",
  visibility: "Visibility",
};

function pretty(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? "" : "s"}`;
  if (typeof v === "boolean") return v ? "Assisted" : "Independent";
  return String(v);
}

export default function CareSummaryVersions({ shiftId, locked = false }: { shiftId: string; locked?: boolean }) {
  const { data: versions = [], isLoading } = useCareSummaryVersions(shiftId);
  const restore = useRestoreCareSummaryVersion();
  const [selected, setSelected] = useState<string | null>(null);

  const current = versions[0];
  const ordered = useMemo(() => versions, [versions]);

  if (isLoading) return null;
  if (!current) return null;

  return (
    <section className="rounded-2xl bg-card border border-border/60 p-5 shadow-lg shadow-background/40">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold tracking-[0.14em] text-primary uppercase inline-flex items-center gap-2">
          <History className="w-3.5 h-3.5" /> Version history
        </h2>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{versions.length} edit{versions.length === 1 ? "" : "s"}</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Each save creates a new version. Tap one to compare with the current version{locked ? "" : " and optionally restore it"}.
      </p>
      <ul className="divide-y divide-border/60">
        {ordered.map((v, idx) => {
          const isCurrent = idx === 0;
          const open = selected === v.id;
          const diffs = isCurrent ? [] : diffSnapshots(current.snapshot, v.snapshot);
          return (
            <li key={v.id} className="py-2">
              <button
                type="button"
                onClick={() => setSelected(open ? null : v.id)}
                className="w-full flex items-center gap-2 text-left rounded-xl hover:bg-secondary/40 transition px-2 py-2 -mx-2"
              >
                <span className={`w-7 h-7 shrink-0 rounded-full inline-flex items-center justify-center text-[10px] font-bold border ${
                  isCurrent ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary text-foreground border-border"
                }`}>v{v.version_no}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {isCurrent ? "Current version" : `${diffs.length || 0} change${diffs.length === 1 ? "" : "s"}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {formatDateTime(v.created_at)}{v.changer_name ? ` · ${v.changer_name}` : ""}
                  </p>
                </div>
                {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
              {open && (
                <div className="pl-9 pr-1 pt-1 pb-2 space-y-2">
                  {isCurrent ? (
                    <p className="text-[11px] text-muted-foreground">This is the live version of the care summary.</p>
                  ) : diffs.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No structured-field differences from the current version.</p>
                  ) : (
                    <div className="rounded-xl border border-border/60 bg-secondary/30 divide-y divide-border/40 text-xs">
                      {diffs.map((f) => (
                        <div key={f} className="px-3 py-2">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{LABELS[f] ?? f}</div>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div>
                              <div className="text-[10px] text-muted-foreground">v{v.version_no}</div>
                              <div className="text-foreground/90 break-words">{pretty(v.snapshot?.[f])}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-primary">Current</div>
                              <div className="text-foreground/90 break-words">{pretty(current.snapshot?.[f])}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!isCurrent && (
                    locked ? (
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Lock className="w-3 h-3" /> Restore disabled — timesheet has been approved.
                      </div>
                    ) : (
                      <RestoreButton version={v} disabled={restore.isPending} onRestore={async () => {
                        try {
                          await restore.mutateAsync({ shiftId, snapshot: v.snapshot });
                          toast.success(`Restored version v${v.version_no}`);
                          setSelected(null);
                        } catch (e: any) {
                          toast.error(e.message ?? "Restore failed");
                        }
                      }} />
                    )
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RestoreButton({ version, onRestore, disabled }: { version: CareSummaryVersion; onRestore: () => void; disabled?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Restore this version
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Replace current with v{version.version_no}?</span>
      <button
        type="button"
        disabled={disabled}
        onClick={onRestore}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg gradient-primary text-primary-foreground font-bold disabled:opacity-50"
      >
        {disabled ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
        Confirm
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-muted-foreground hover:text-foreground">
        Cancel
      </button>
    </div>
  );
}