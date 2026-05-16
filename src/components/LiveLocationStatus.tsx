import { MapPin, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useLiveLocation } from "@/hooks/useLiveLocation";

function timeAgo(d: Date | null): string {
  if (!d) return "—";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const LiveLocationStatus = ({ compact = false }: { compact?: boolean }) => {
  const { permission, accuracy, lastFixAt, error, refresh } = useLiveLocation();

  let tone = "bg-muted text-muted-foreground border-border";
  let Icon: any = Loader2;
  let iconClass = "w-3.5 h-3.5 animate-spin";
  let label = "Locating…";

  if (permission === "denied" || permission === "unsupported") {
    tone = "bg-destructive/10 text-destructive border-destructive/30";
    Icon = AlertTriangle;
    iconClass = "w-3.5 h-3.5";
    label = permission === "unsupported" ? "GPS not supported" : "Location blocked";
  } else if (lastFixAt && accuracy != null) {
    tone = "bg-success/10 text-success border-success/30";
    Icon = CheckCircle2;
    iconClass = "w-3.5 h-3.5";
    label = `Live · ±${Math.round(accuracy)}m · ${timeAgo(lastFixAt)}`;
  } else if (error) {
    tone = "bg-warning/10 text-warning border-warning/30";
    Icon = AlertTriangle;
    iconClass = "w-3.5 h-3.5";
    label = "GPS unavailable";
  }

  return (
    <button
      type="button"
      onClick={refresh}
      title={error || "Tap to refresh GPS"}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${tone}`}
    >
      <MapPin className="w-3 h-3" />
      <Icon className={iconClass} />
      <span className="truncate max-w-[200px]">{compact ? label.split(" · ")[0] : label}</span>
    </button>
  );
};

export default LiveLocationStatus;