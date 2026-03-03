import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Phone, FileText, AlertTriangle, User } from "lucide-react";
import { shifts } from "@/data/mockData";
import StatusBadge from "@/components/shifts/StatusBadge";
import type { ShiftStatus } from "@/data/mockData";
import ClockOutForm from "@/components/shifts/ClockOutForm";

const ShiftDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const shift = shifts.find((s) => s.id === id);
  const [status, setStatus] = useState<ShiftStatus>(shift?.status ?? "not_started");
  const [showClockOut, setShowClockOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!shift) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Shift not found</p>
      </div>
    );
  }

  const handleClockIn = () => {
    setShowConfirm(true);
  };

  const confirmClockIn = () => {
    setStatus("in_progress");
    setShowConfirm(false);
  };

  const handleClockOut = () => {
    setShowClockOut(true);
  };

  const handleClockOutSubmit = () => {
    setStatus("completed");
    setShowClockOut(false);
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* Header */}
      <div className="gradient-header px-5 pt-4 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-primary-foreground/80 hover:text-primary-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary-foreground">
              {shift.client.name}
            </h1>
            <p className="text-sm text-primary-foreground/70 mt-0.5">
              {shift.client.careType}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="px-5 py-5 space-y-4 pb-32">
        {/* Details Cards */}
        <div className="bg-card rounded-2xl p-4 shadow-card space-y-3.5">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Address</p>
              <p className="text-sm text-card-foreground">{shift.client.address}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Scheduled Time</p>
              <p className="text-sm text-card-foreground">
                {shift.date} · {shift.startTime} – {shift.endTime}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Emergency Contact</p>
              <p className="text-sm text-card-foreground">
                {shift.client.emergencyContact} · {shift.client.emergencyPhone}
              </p>
            </div>
          </div>
        </div>

        {/* Care Plan */}
        <div className="bg-card rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-card-foreground">Care Plan</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {shift.client.carePlanSummary}
          </p>
        </div>

        {/* Admin Notes */}
        {shift.adminNotes && (
          <div className="bg-accent rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-accent-foreground" />
              <h3 className="text-sm font-semibold text-accent-foreground">Admin Notes</h3>
            </div>
            <p className="text-sm text-accent-foreground/80 leading-relaxed">
              {shift.adminNotes}
            </p>
          </div>
        )}
      </div>

      {/* Clock In/Out Button */}
      {status !== "completed" && status !== "missed" && (
        <div className="fixed bottom-20 left-0 right-0 px-5 max-w-lg mx-auto">
          <button
            onClick={status === "not_started" ? handleClockIn : handleClockOut}
            className={`w-full py-4 rounded-2xl text-base font-bold shadow-lg transition-all active:scale-[0.98] ${
              status === "not_started"
                ? "gradient-primary text-primary-foreground"
                : "bg-destructive text-destructive-foreground"
            }`}
          >
            {status === "not_started" ? "🟢  CLOCK IN" : "🔴  CLOCK OUT"}
          </button>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end max-w-lg mx-auto">
          <div className="bg-card w-full rounded-t-3xl p-6 animate-slide-up">
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
            <div className="text-center mb-6">
              <div className="w-14 h-14 gradient-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">Confirm Clock In</h3>
              <p className="text-sm text-muted-foreground mt-2">
                You are clocking in for <strong>{shift.client.name}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                📍 GPS location will be captured
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 rounded-xl border border-border text-sm font-semibold text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={confirmClockIn}
                className="flex-1 py-3.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clock Out Form */}
      {showClockOut && (
        <ClockOutForm
          clientName={shift.client.name}
          onClose={() => setShowClockOut(false)}
          onSubmit={handleClockOutSubmit}
        />
      )}
    </div>
  );
};

export default ShiftDetail;
