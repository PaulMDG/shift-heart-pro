import { Clock, MapPin, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Shift, ShiftStatus } from "@/data/mockData";

const statusConfig: Record<ShiftStatus, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", className: "bg-primary/15 text-primary font-semibold" },
  completed: { label: "Completed", className: "bg-success/15 text-success" },
  missed: { label: "Missed", className: "bg-destructive/15 text-destructive" },
};

const ShiftCard = ({ shift }: { shift: Shift }) => {
  const navigate = useNavigate();
  const status = statusConfig[shift.status];

  return (
    <button
      onClick={() => navigate(`/shifts/${shift.id}`)}
      className="w-full bg-card rounded-2xl p-4 border border-border hover:border-primary/30 transition-all text-left"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-card-foreground">{shift.client.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{shift.client.careType}</p>
        </div>
        <span className={`text-[11px] px-2.5 py-1 rounded-full ${status.className}`}>
          {status.label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs">{shift.startTime} – {shift.endTime}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs truncate">{shift.client.address}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
      </div>
    </button>
  );
};

export default ShiftCard;
