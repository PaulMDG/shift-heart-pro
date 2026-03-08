import { ArrowRightLeft, Check, X, Loader2 } from "lucide-react";
import type { SwapRequestWithDetails } from "@/hooks/useSwapRequests";

interface SwapRequestCardProps {
  request: SwapRequestWithDetails;
  variant: "incoming" | "outgoing";
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onCancel?: (id: string) => void;
  isLoading?: boolean;
}

const statusStyles: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning" },
  accepted: { label: "Accepted", className: "bg-success/15 text-success" },
  declined: { label: "Declined", className: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

const SwapRequestCard = ({ request, variant, onAccept, onDecline, onCancel, isLoading }: SwapRequestCardProps) => {
  const status = statusStyles[request.status] ?? statusStyles.pending;
  const shift = request.shift;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
            <ArrowRightLeft className="w-4 h-4 text-accent-foreground" />
          </div>
          <div>
            <h4 className="font-semibold text-card-foreground text-sm">{shift?.client?.name}</h4>
            <p className="text-xs text-muted-foreground">
              {shift?.date} · {shift?.start_time} – {shift?.end_time}
            </p>
          </div>
        </div>
        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      {variant === "incoming" && request.requester && (
        <p className="text-xs text-muted-foreground">
          Requested by <span className="font-medium text-foreground">{request.requester.full_name}</span>
        </p>
      )}

      {shift?.client?.care_type && (
        <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
          {shift.client.care_type}
        </span>
      )}

      {request.status === "pending" && (
        <div className="flex gap-2 pt-1">
          {variant === "incoming" && onAccept && onDecline && (
            <>
              <button
                onClick={() => onAccept(request.id)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Accept
              </button>
              <button
                onClick={() => onDecline(request.id)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Decline
              </button>
            </>
          )}
          {variant === "outgoing" && onCancel && (
            <button
              onClick={() => onCancel(request.id)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm font-semibold disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel Request
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SwapRequestCard;
