import { useState } from "react";
import { ChevronDown, ChevronRight, History, FileText } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useVisitHistory } from "@/hooks/useShiftDocuments";
import { useCareSummary } from "@/hooks/useCareSummary";
import { formatDateLong, formatTime } from "@/lib/format";
import CareSummaryPreview from "./CareSummaryPreview";
import { useNavigate } from "react-router-dom";

interface Visit {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  clock_out_notes: string | null;
}

function HistoryItem({ visit }: { visit: Visit }) {
  const [open, setOpen] = useState(false);
  const { data: summary } = useCareSummary(open ? visit.id : undefined);
  const navigate = useNavigate();
  const hasSummary = !!summary?.submitted_at;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="py-1">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-3 py-2.5 text-left rounded-xl hover:bg-secondary/40 transition px-2 -mx-2"
        >
          <span className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <History className="w-4 h-4 text-primary" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{formatDateLong(visit.date)}</p>
            <p className="text-xs text-muted-foreground truncate">
              {formatTime(visit.start_time)} – {formatTime(visit.end_time)}
              {visit.clock_out_notes ? " · Notes on file" : ""}
            </p>
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-12 pr-1 pb-2 animate-accordion-down">
        {hasSummary ? (
          <CareSummaryPreview shiftId={visit.id} embedded />
        ) : (
          <button
            type="button"
            onClick={() => navigate(`/shifts/${visit.id}`)}
            className="w-full rounded-xl border border-dashed border-border/60 bg-secondary/30 p-3 text-left text-xs text-muted-foreground inline-flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5 text-primary" />
            No structured care summary on file for this visit. Open shift to view legacy notes.
          </button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function CareSummaryHistory({ clientId, excludeShiftId }: { clientId?: string; excludeShiftId?: string }) {
  const { data: history = [] } = useVisitHistory(clientId, excludeShiftId);
  if (!history.length) return null;

  return (
    <section className="rounded-2xl bg-card border border-border/60 p-5 shadow-lg shadow-background/40">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold tracking-[0.14em] text-primary uppercase inline-flex items-center gap-2">
          <History className="w-3.5 h-3.5" /> Care Summary History
        </h2>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{history.length} recent</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">Tap a visit to view its compact care summary.</p>
      <ul className="divide-y divide-border/60">
        {history.map((v: any) => (
          <li key={v.id}>
            <HistoryItem visit={v} />
          </li>
        ))}
      </ul>
    </section>
  );
}