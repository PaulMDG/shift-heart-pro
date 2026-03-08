import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRightLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useShift } from "@/hooks/useShifts";
import { useCreateSwapRequest, useMySwapRequests } from "@/hooks/useSwapRequests";
import { toast } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";

const ShiftSwapPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: shift, isLoading: shiftLoading } = useShift(id);
  const createSwap = useCreateSwapRequest();
  const { data: myRequests = [] } = useMySwapRequests();
  const [submitted, setSubmitted] = useState(false);

  const existingRequest = myRequests.find(
    (r) => r.shift_id === id && r.status === "pending"
  );

  const handleRequestSwap = async () => {
    if (!id) return;
    try {
      await createSwap.mutateAsync({ shiftId: id });
      setSubmitted(true);
      toast.success("Swap request posted! Other caregivers can now pick it up.");
    } catch (error: any) {
      toast.error(error.message || "Failed to create swap request");
    }
  };

  if (shiftLoading) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto px-5 py-10 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Shift not found</p>
      </div>
    );
  }

  const alreadyRequested = !!existingRequest || submitted;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-primary font-medium flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="px-5 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
            <ArrowRightLeft className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Swap Shift</h2>
            <p className="text-sm text-muted-foreground">Request another caregiver to cover</p>
          </div>
        </div>

        {/* Current shift details */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your shift</p>
          <h3 className="text-lg font-bold text-card-foreground">{shift.client.name}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{shift.date}</span>
            <span>{shift.start_time} – {shift.end_time}</span>
          </div>
          <p className="text-sm text-muted-foreground">{shift.client.address}</p>
          <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-accent text-accent-foreground font-medium">
            {shift.client.care_type}
          </span>
        </div>

        {alreadyRequested ? (
          <div className="bg-success/10 rounded-2xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Swap Request Sent</h3>
            <p className="text-sm text-muted-foreground">
              Your request has been posted. You'll be notified when another caregiver picks it up.
            </p>
            <button
              onClick={() => navigate("/shifts")}
              className="mt-2 px-6 py-2.5 rounded-xl bg-muted text-foreground text-sm font-semibold"
            >
              Back to Shifts
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-accent/50 rounded-2xl p-5 space-y-2">
              <p className="text-sm font-semibold text-foreground">How it works</p>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>You post a swap request for this shift</li>
                <li>Other caregivers see it and can accept</li>
                <li>The shift is reassigned automatically</li>
              </ol>
            </div>

            <button
              onClick={handleRequestSwap}
              disabled={createSwap.isPending}
              className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground text-lg font-bold disabled:opacity-50 transition-opacity active:scale-[0.98]"
            >
              {createSwap.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Request Swap"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftSwapPage;
