import { Clock, MapPin, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ShiftWithClient } from "@/hooks/useShifts";

const statusConfig: Record<string, { label: string; className: string }> = {
  not_started: {
    label: "Not Started",
    className: "bg-muted text-muted-foreground",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-primary/15 text-primary font-semibold",
  },
  completed: {
    label: "Completed",
    className: "bg-success/15 text-success",
  },
  missed: {
    label: "Missed",
    className: "bg-destructive/15 text-destructive",
  },
};

const assignmentConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending Response",
    className: "bg-warning/15 text-warning",
  },
  accepted: {
    label: "Accepted",
    className: "bg-success/15 text-success",
  },
  declined: {
    label: "Declined",
    className: "bg-destructive/15 text-destructive",
  },
};

const ShiftCard = ({ shift }: { shift: ShiftWithClient }) => {
  const navigate = useNavigate();

  const status = statusConfig[shift.status] ?? statusConfig.not_started;

  const assignmentStatus =
    shift.assignment_status && assignmentConfig[shift.assignment_status]
      ? assignmentConfig[shift.assignment_status]
      : null;

  const clientName = shift.client?.name || "Assigned Client";
  const careType = shift.client?.care_type || "Care shift";
  const address = shift.client?.address || "Client address unavailable";

  return (
    <button
      type="button"
      onClick={() => navigate(`/shifts/${shift.id}`)}
      className="w-full bg-card rounded-2xl p-4 border border-border hover:border-primary/30 hover:shadow-sm active:scale-[0.99] transition-all text-left"
    >
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-card-foreground truncate">
            {clientName}
          </h3>

          <p className="text-xs text-muted-foreground mt-0.5">
            {careType}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          {assignmentStatus && (
            <span
              className={`text-[10px] px-2.5 py-1 rounded-full ${assignmentStatus.className}`}
            >
              {assignmentStatus.label}
            </span>
          )}

          <span
            className={`text-[10px] px-2.5 py-1 rounded-full ${status.className}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs">
            {shift.start_time} – {shift.end_time}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs truncate">{address}</span>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
      </div>
    </button>
  );
};

export default ShiftCard;
