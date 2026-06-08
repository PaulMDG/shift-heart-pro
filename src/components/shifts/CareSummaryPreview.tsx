import { useCareSummary } from "@/hooks/useCareSummary";
import { FileText, ChevronRight, Mic, Image as ImageIcon, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDateTime } from "@/lib/format";

export default function CareSummaryPreview({ shiftId }: { shiftId: string }) {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useCareSummary(shiftId);

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

  return (
    <section className="rounded-2xl bg-card border border-border/60 p-5 shadow-lg shadow-background/40">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold tracking-[0.14em] text-primary uppercase inline-flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" /> Care Summary
        </h2>
        <button
          type="button"
          onClick={() => navigate(`/shifts/${shiftId}/care-notes`)}
          className="text-sm font-medium text-primary inline-flex items-center gap-0.5 hover:underline"
        >
          View full <ChevronRight className="w-4 h-4" />
        </button>
      </div>

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
    </section>
  );
}