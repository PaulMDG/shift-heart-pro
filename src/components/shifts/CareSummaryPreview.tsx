import { useCareSummary } from "@/hooks/useCareSummary";
import { useCareNoteAudits } from "@/hooks/useCareNoteAudits";
import { FileText, ChevronRight, Mic, Image as ImageIcon, Eye, EyeOff, AlertTriangle, PenSquare, Lock, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDateTime } from "@/lib/format";

interface Props {
  shiftId: string;
  /** Embedded inside a list (history) — hide header/CTA. */
  embedded?: boolean;
  /** Show a prominent "Review & edit" CTA (e.g. before timesheet approval). */
  editable?: boolean;
  /** When true the summary is read-only; renders a Locked badge and audit footer instead of edit CTAs. */
  locked?: boolean;
  /** Optional approval timestamp/note shown in the locked footer. */
  lockedAt?: string | null;
}

export default function CareSummaryPreview({ shiftId, embedded = false, editable = false, locked = false, lockedAt = null }: Props) {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useCareSummary(shiftId);
  const { data: audits = [] } = useCareNoteAudits(locked ? shiftId : undefined);

  if (isLoading || !summary || !summary.submitted_at) return null;

  const Chip = ({ label, value, tone = "default" }: { label: string; value: string | null | undefined; tone?: "default" | "warn" }) => {
    if (!value) return null;
    return (
      <div className={`rounded-xl border px-2.5 py-2 text-center ${tone === "warn" ? "bg-warning/10 border-warning/30" : "bg-secondary/40 border-border/60"}`}>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`text-xs font-semibold mt-0.5 ${tone === "warn" ? "text-warning" : "text-foreground"}`}>{value}</div>
      </div>
    );
  };

  const incidentTone = summary.incident_severity && summary.incident_severity !== "None" ? "warn" : "default";

  const body = (
    <>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Chip label="Meals" value={summary.meals_status} />
        <Chip label="Meds" value={summary.medications_status === "Given" && summary.medications_count != null ? `Given · ${summary.medications_count}` : summary.medications_status} />
        <Chip label="Hydration" value={summary.hydration} />
        <Chip label="Bowel" value={summary.bowel_movement} />
        <Chip label="Mobility" value={summary.mobility_assisted === null ? null : summary.mobility_assisted ? "Assisted" : "Independent"} />
        <Chip label="Incident" value={summary.incident_severity} tone={incidentTone} />
      </div>

      {incidentTone === "warn" && summary.incident_note && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 p-3 mb-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/90 leading-relaxed">{summary.incident_note}</p>
        </div>
      )}

      {summary.notes_text && (
        <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3 mb-3">{summary.notes_text}</p>
      )}

      <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
        {summary.voice_url && (
          <span className="inline-flex items-center gap-1"><Mic className="w-3 h-3 text-primary" /> Voice note</span>
        )}
        {summary.photo_urls?.length > 0 && (
          <span className="inline-flex items-center gap-1"><ImageIcon className="w-3 h-3 text-primary" /> {summary.photo_urls.length} photo{summary.photo_urls.length === 1 ? "" : "s"}</span>
        )}
        <span className="inline-flex items-center gap-1">
          {summary.visibility === "care_team_only" ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {summary.visibility === "care_team_only" ? "Care team only" : "Family & care team"}
        </span>
        <span className="ml-auto">Submitted {formatDateTime(summary.submitted_at)}</span>
      </div>

      {locked ? (
        <div className="mt-4 rounded-xl border border-success/30 bg-success/5 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-success uppercase tracking-wider">Locked — timesheet approved</p>
              <p className="text-[11px] text-foreground/80 mt-0.5 leading-relaxed">
                This care summary can no longer be edited. The version below is the approved record of the visit
                {lockedAt ? ` (approved ${formatDateTime(lockedAt)})` : ""}.
              </p>
            </div>
          </div>
          {audits.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Audit trail · {audits.length} change{audits.length === 1 ? "" : "s"}</p>
              <ul className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {audits.slice(0, 6).map((a) => (
                  <li key={a.id} className="text-[11px] text-muted-foreground">
                    {formatDateTime(a.changed_at)}{a.changer_name ? ` · ${a.changer_name}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : editable && (
        <button
          type="button"
          onClick={() => navigate(`/shifts/${shiftId}/care-notes`)}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/40 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition"
        >
          <PenSquare className="w-4 h-4" /> Review & edit care notes
        </button>
      )}
    </>
  );

  if (embedded) return <div className="pt-1">{body}</div>;

  return (
    <section className="rounded-2xl bg-card border border-border/60 p-5 shadow-lg shadow-background/40">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold tracking-[0.14em] text-primary uppercase inline-flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" /> Care Summary
          {locked && (
            <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success/15 text-success text-[9px] font-bold">
              <Lock className="w-2.5 h-2.5" /> LOCKED
            </span>
          )}
        </h2>
        {locked ? (
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Lock className="w-3 h-3" /> Read-only
          </span>
        ) : (
          <button
            type="button"
            onClick={() => navigate(`/shifts/${shiftId}/care-notes`)}
            className="text-sm font-medium text-primary inline-flex items-center gap-0.5 hover:underline"
          >
            {editable ? "Edit" : "View full"} <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      {body}
    </section>
  );
}