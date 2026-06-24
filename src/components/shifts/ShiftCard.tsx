import { Clock, MapPin, ChevronRight, Check, X, Satellite, AlertTriangle, Loader2, MapPinOff, MapPinned } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type ShiftWithClient, useUpdateAssignmentStatus } from "@/hooks/useShifts";
import { toast } from "@/components/ui/sonner";
import { formatTime } from "@/lib/format";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { useAgencySettings } from "@/hooks/useAgencySettings";
import { metersToFeet } from "@/hooks/useGeolocation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useClientPhotoUrl } from "@/lib/clientPhoto";

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
  const updateAssignment = useUpdateAssignmentStatus();
  const { permission, accuracy, lastFixAt } = useLiveLocation();
  const { data: settings } = useAgencySettings();

  const status = statusConfig[shift.status] ?? statusConfig.not_started;

  const assignmentStatus =
    shift.assignment_status && assignmentConfig[shift.assignment_status]
      ? assignmentConfig[shift.assignment_status]
      : null;

  const clientName = shift.client?.name || "Assigned Client";
  const careType = shift.client?.care_type || "Care shift";
  const address = shift.client?.address || "Client address unavailable";
  const photoUrl = useClientPhotoUrl((shift.client as any)?.photo_url ?? null);
  const initials = clientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const showAcceptDecline =
    shift.assignment_status === "pending" && shift.status === "not_started";

  const threshold = settings?.accuracy_threshold_m ?? 100;
  const showGpsPill = shift.status !== "completed" && shift.status !== "missed";
  let gpsTone = "bg-muted text-muted-foreground border-border";
  let GpsIcon: any = Loader2;
  let gpsIconClass = "w-3 h-3 animate-spin";
  let gpsLabel = "Locating…";
  if (permission === "denied" || permission === "unsupported") {
    gpsTone = "bg-destructive/10 text-destructive border-destructive/30";
    GpsIcon = AlertTriangle;
    gpsIconClass = "w-3 h-3";
    gpsLabel = permission === "unsupported" ? "GPS off" : "Blocked";
  } else if (lastFixAt && accuracy != null) {
    const ok = accuracy <= threshold;
    gpsTone = ok
      ? "bg-success/10 text-success border-success/30"
      : "bg-warning/15 text-warning border-warning/30";
    GpsIcon = Satellite;
    gpsIconClass = "w-3 h-3";
    gpsLabel = `±${Math.round(metersToFeet(accuracy))}ft${ok ? " · Ready" : " · Weak"}`;
  }

  // Client-coords readiness: independent of device GPS.
  const clientHasCoords = shift.client?.lat != null && shift.client?.lng != null;
  const showReadyPill = shift.status !== "completed" && shift.status !== "missed";
  const readyTone = clientHasCoords
    ? "bg-success/10 text-success border-success/30"
    : "bg-destructive/10 text-destructive border-destructive/30";
  const ReadyIcon = clientHasCoords ? MapPinned : MapPinOff;
  const readyLabel = clientHasCoords ? "Ready for Clock-in" : "Missing Coordinates";
  const readyTitle = clientHasCoords
    ? "Client address has GPS coordinates — clock-in is enabled."
    : "Client address has no GPS coordinates. Ask an admin to set them before clock-in.";

  const handleAssignment = (e: React.MouseEvent, action: "accepted" | "declined") => {
    e.stopPropagation();
    updateAssignment.mutate(
      { id: shift.id, assignment_status: action },
      {
        onSuccess: () =>
          toast.success(action === "accepted" ? "Shift accepted." : "Shift declined."),
        onError: (err: any) => toast.error(err?.message || "Action failed"),
      },
    );
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/shifts/${shift.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate(`/shifts/${shift.id}`);
      }}
      aria-label={`Open shift for ${clientName} at ${formatTime(shift.start_time)}`}
      className="focus-ring w-full bg-surface text-surface-foreground rounded-2xl p-4 border border-[hsl(var(--ivory-border))] shadow-soft hover:border-primary/40 hover:-translate-y-0.5 active:scale-[0.99] transition-all text-left cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <Avatar aria-hidden className="shrink-0 w-11 h-11">
            <AvatarImage src={photoUrl ?? undefined} alt="" />
            <AvatarFallback
              className="text-sm font-bold text-white"
              style={{
                background:
                  "linear-gradient(135deg, hsl(32 55% 62%), hsl(28 50% 50%))",
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-semibold text-surface-foreground truncate">
              {clientName}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{careType}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {showReadyPill && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${readyTone}`}
              title={readyTitle}
            >
              <ReadyIcon className="w-3 h-3" />
              {readyLabel}
            </span>
          )}
          {showGpsPill && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${gpsTone}`}
              title={`GPS accuracy threshold: ±${threshold}m`}
            >
              <GpsIcon className={gpsIconClass} />
              {gpsLabel}
            </span>
          )}
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
            {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs truncate">{address}</span>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
      </div>

      {showAcceptDecline && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-[hsl(var(--ivory-border))]">
          <button
            type="button"
            onClick={(e) => handleAssignment(e, "accepted")}
            disabled={updateAssignment.isPending}
            className="focus-ring flex-1 min-h-11 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Accept
          </button>
          <button
            type="button"
            onClick={(e) => handleAssignment(e, "declined")}
            disabled={updateAssignment.isPending}
            className="focus-ring flex-1 min-h-11 py-2.5 rounded-xl border border-[hsl(var(--ivory-border))] text-sm font-bold text-foreground inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <X className="w-4 h-4" /> Decline
          </button>
        </div>
      )}
    </div>
  );
};

export default ShiftCard;
