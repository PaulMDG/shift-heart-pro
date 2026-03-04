import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, User } from "lucide-react";
import { useShift, useUpdateShiftStatus } from "@/hooks/useShifts";
import ClockOutForm from "@/components/shifts/ClockOutForm";
import { Skeleton } from "@/components/ui/skeleton";

const ShiftDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: shift, isLoading } = useShift(id);
  const updateStatus = useUpdateShiftStatus();
  const [showClockOut, setShowClockOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto px-5 py-10 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-20 rounded-2xl" />
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

  const status = shift.status;

  const handleClockIn = () => setShowConfirm(true);
  const confirmClockIn = () => {
    updateStatus.mutate({ id: shift.id, status: "in_progress", clock_in_time: new Date().toISOString() });
    setShowConfirm(false);
  };
  const handleClockOut = () => setShowClockOut(true);
  const handleClockOutSubmit = (notes?: string) => {
    updateStatus.mutate({ id: shift.id, status: "completed", clock_out_time: new Date().toISOString(), clock_out_notes: notes });
    setShowClockOut(false);
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-primary font-medium flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-lg font-bold text-foreground">CareLink Pro</span>
      </div>

      <div className="px-5 py-6 space-y-6 pb-36">
        <h2 className="text-2xl font-bold text-foreground">Shift Details</h2>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{shift.client.name}</h3>
            <p className="text-sm text-muted-foreground">{shift.client.address}</p>
          </div>
        </div>

        <div className="border-t border-border" />

        <div className="flex gap-8">
          <span className="text-base font-semibold text-foreground w-24 shrink-0">Scheduled</span>
          <div>
            <p className="text-lg font-bold text-foreground">{shift.start_time} – {shift.end_time}</p>
            <p className="text-sm text-muted-foreground">{shift.client.care_type}</p>
          </div>
        </div>

        <div className="border-t border-border" />

        <div className="flex gap-8">
          <span className="text-base font-semibold text-foreground w-24 shrink-0">Notes</span>
          <p className="text-sm text-muted-foreground leading-relaxed">{shift.admin_notes}</p>
        </div>

        {status !== "completed" && status !== "missed" && (
          <button
            onClick={status === "not_started" ? handleClockIn : handleClockOut}
            disabled={updateStatus.isPending}
            className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground text-lg font-bold tracking-wide mt-4 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {status === "not_started" ? "CLOCK IN" : "CLOCK OUT"}
          </button>
        )}

        {status === "completed" && (
          <div className="w-full py-4 rounded-2xl bg-success/15 text-success text-lg font-bold text-center">
            ✓ Completed
          </div>
        )}

        <div className="border-t border-border" />

        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Shift Actions</h3>
          <button
            onClick={() => navigate(`/shifts/${id}/swap`)}
            className="w-full flex items-center justify-between py-3"
          >
            <span className="text-base text-foreground">Swap Shift</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end max-w-lg mx-auto">
          <div className="bg-card w-full rounded-t-3xl p-6 animate-slide-up">
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
            <div className="text-center mb-6">
              <div className="w-14 h-14 gradient-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Confirm Clock In</h3>
              <p className="text-sm text-muted-foreground mt-2">
                You are clocking in for <strong>{shift.client.name}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">📍 GPS location will be captured</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3.5 rounded-xl border border-border text-sm font-semibold text-foreground">
                Cancel
              </button>
              <button onClick={confirmClockIn} className="flex-1 py-3.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showClockOut && (
        <ClockOutForm clientName={shift.client.name} onClose={() => setShowClockOut(false)} onSubmit={handleClockOutSubmit} />
      )}
    </div>
  );
};

export default ShiftDetail;
