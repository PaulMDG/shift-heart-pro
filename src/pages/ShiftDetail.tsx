import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, User, MapPin, Loader2, MessageSquare, ExternalLink, CheckCircle2, RefreshCw, ShieldCheck, HelpCircle, Navigation, Calendar, Clock, Briefcase, FileText, Sun, TimerReset } from "lucide-react";
import { useShift, useUpdateShiftStatus, useUpdateAssignmentStatus } from "@/hooks/useShifts";
import { getCurrentPosition, getDistanceMeters, MAX_DISTANCE_METERS, formatDistanceMiles, metersToFeet } from "@/hooks/useGeolocation";
import ClockOutForm from "@/components/shifts/ClockOutForm";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { formatTime, formatDateTime, formatDateLong } from "@/lib/format";
import LiveLocationStatus from "@/components/LiveLocationStatus";
import { useAgencySettings } from "@/hooks/useAgencySettings";
import { useLiveLocation } from "@/hooks/useLiveLocation";

const ShiftDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: shift, isLoading } = useShift(id);
  const { data: settings } = useAgencySettings();
  const liveLocation = useLiveLocation();
  const updateStatus = useUpdateShiftStatus();
  const updateAssignment = useUpdateAssignmentStatus();
  const [showClockOut, setShowClockOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastVerifiedPosition, setLastVerifiedPosition] = useState<{lat: number; lng: number} | null>(null);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [retryStartedAt, setRetryStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const RETRY_COUNTDOWN_MS = 10_000;
  const retryElapsed = retryStartedAt ? nowTick - retryStartedAt : 0;
  const retryRemainingMs = retryStartedAt ? Math.max(0, RETRY_COUNTDOWN_MS - retryElapsed) : 0;
  const retryRemainingSec = Math.ceil(retryRemainingMs / 1000);
  const hasFreshFix =
    retryStartedAt != null &&
    liveLocation.lastFixAt != null &&
    liveLocation.lastFixAt.getTime() > retryStartedAt;
  const retryReady = retryStartedAt != null && retryRemainingMs === 0 && hasFreshFix;
  const retryPending = retryStartedAt != null && !retryReady;

  useEffect(() => {
    if (retryStartedAt == null) return;
    const i = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(i);
  }, [retryStartedAt]);

  useEffect(() => {
    if (!retryReady) return;
    setRetryStartedAt(null);
    setLocationError(null);
    if (status === "not_started") {
      confirmClockIn();
    } else if (status === "in_progress") {
      verifyLocationAndProceed(() => setShowClockOut(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryReady]);

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
  const clientHasLocation = shift.client.lat != null && shift.client.lng != null;

  const verifyLocationAndProceed = async (
    onSuccess: (pos: { lat: number; lng: number; accuracy: number }) => void,
  ) => {
    setLocationError(null);

    if (!clientHasLocation) {
      setLocationError("Client location is not configured. GPS verification is mandatory — please contact your administrator to set the client's address coordinates.");
      return;
    }

    setVerifyingLocation(true);
    try {
      const pos = await getCurrentPosition();
      const accuracyThreshold = settings?.accuracy_threshold_m ?? 100;
      if (pos.accuracy == null || pos.accuracy > accuracyThreshold) {
        const msg = pos.accuracy == null
          ? `Unable to read GPS accuracy from your device. Move outdoors with a clear view of the sky and try again.`
          : `GPS accuracy is too low (±${Math.round(metersToFeet(pos.accuracy))} ft). Agency requires ±${Math.round(metersToFeet(accuracyThreshold))} ft or better. Move outdoors or wait a few seconds, then try again.`;
        setLocationError(msg);
        toast.error("GPS accuracy not met — cannot clock in");
        return;
      }
      const distance = getDistanceMeters(pos, {
        lat: shift.client.lat!,
        lng: shift.client.lng!,
      });

      if (distance <= MAX_DISTANCE_METERS) {
        toast.success(`Location verified (${formatDistanceMiles(distance)} from client)`);
        setLastVerifiedPosition(pos);
        setLastAccuracy(pos.accuracy);
        onSuccess(pos);
      } else {
        const distanceText = formatDistanceMiles(distance);
        setLocationError(
          `You are ${distanceText} from ${shift.client.name}'s location. You must be within ${formatDistanceMiles(MAX_DISTANCE_METERS)} of the client address to clock in/out. Please travel to: ${shift.client.address}`
        );
      }
    } catch (err: any) {
      setLocationError(err.message);
    } finally {
      setVerifyingLocation(false);
    }
  };

  const handleClockIn = () => {
    setLocationError(null);
    setShowConfirm(true);
  };

  const confirmClockIn = () => {
    verifyLocationAndProceed((pos) => {
      setShowConfirm(false);
      updateStatus.mutate({
        id: shift.id,
        status: "in_progress",
        clock_in_time: new Date().toISOString(),
        clock_in_lat: pos.lat,
        clock_in_lng: pos.lng,
        clock_in_accuracy: pos.accuracy,
      });
    });
  };

  const handleClockOut = () => {
    setLocationError(null);
    verifyLocationAndProceed(() => {
      setShowClockOut(true);
    });
  };

  const handleClockOutSubmit = (notes?: string) => {
    updateStatus.mutate({
      id: shift.id,
      status: "completed",
      clock_out_time: new Date().toISOString(),
      clock_out_notes: notes,
      ...(lastVerifiedPosition && { clock_out_lat: lastVerifiedPosition.lat, clock_out_lng: lastVerifiedPosition.lng }),
      ...(lastAccuracy != null && { clock_out_accuracy: lastAccuracy }),
    });
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
        <div className="ml-auto"><LiveLocationStatus compact /></div>
      </div>

      <div className="px-5 py-6 space-y-6 pb-36">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-foreground">Shift Details</h2>
          <LiveLocationStatus />
        </div>

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
            <p className="text-lg font-bold text-foreground">{formatTime(shift.start_time)} – {formatTime(shift.end_time)}</p>
            <p className="text-sm text-muted-foreground">{shift.client.care_type}</p>
          </div>
        </div>

        <div className="border-t border-border" />

        <div className="flex gap-8">
          <span className="text-base font-semibold text-foreground w-24 shrink-0">Notes</span>
          <p className="text-sm text-muted-foreground leading-relaxed">{shift.admin_notes}</p>
        </div>

        {locationError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Location Verification Failed</p>
                <p className="text-xs text-destructive/80 mt-1 leading-relaxed">{locationError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                liveLocation.refresh();
                setRetryStartedAt(Date.now());
                setNowTick(Date.now());
              }}
              disabled={verifyingLocation || retryPending}
              className="w-full mt-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-destructive/30 bg-background text-destructive text-sm font-semibold hover:bg-destructive/5 active:scale-[0.98] transition disabled:opacity-50"
            >
              {verifyingLocation || retryPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {verifyingLocation
                ? "Retrying…"
                : retryPending
                  ? retryRemainingMs > 0
                    ? `Waiting for new GPS fix… ${retryRemainingSec}s`
                    : "Waiting for new GPS fix…"
                  : "Refresh GPS & try again"}
            </button>
          </div>
        )}

        {verifyingLocation && (
          <div className="flex items-center justify-center gap-2 py-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Verifying your location…</span>
          </div>
        )}

        {status !== "completed" && status !== "missed" && (
          <button
            onClick={status === "not_started" ? handleClockIn : handleClockOut}
            disabled={updateStatus.isPending || verifyingLocation}
            className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground text-lg font-bold tracking-wide mt-4 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {verifyingLocation ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Verifying Location…
              </span>
            ) : status === "not_started" ? "CLOCK IN" : "CLOCK OUT"}
          </button>
        )}

        {status === "completed" && (
          <div className="w-full py-4 rounded-2xl bg-success/15 text-success text-lg font-bold text-center">
            ✓ Completed
          </div>
        )}

        {/* Verification Details */}
        {(shift.clock_in_time || shift.clock_out_time) && (
          <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" /> GPS Verification Summary
            </h3>
            {shift.clock_in_time && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Clock In</p>
                <p className="text-xs text-muted-foreground">Timestamp: {formatDateTime(shift.clock_in_time)}</p>
                {shift.clock_in_lat != null && shift.clock_in_lng != null && shift.client.lat != null && shift.client.lng != null && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Distance from client: {formatDistanceMiles(getDistanceMeters({ lat: shift.clock_in_lat, lng: shift.clock_in_lng }, { lat: shift.client.lat, lng: shift.client.lng }))}
                    </p>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${shift.clock_in_lat},${shift.clock_in_lng}&destination=${shift.client.lat},${shift.client.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      View on map <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
                <p className="text-xs text-muted-foreground">Geofence radius: {formatDistanceMiles(MAX_DISTANCE_METERS)}</p>
                {(shift as any).clock_in_accuracy != null && (
                  <p className="text-xs text-muted-foreground">GPS accuracy: ±{Math.round(metersToFeet((shift as any).clock_in_accuracy))} ft</p>
                )}
              </div>
            )}
            {shift.clock_out_time && (
              <div className="space-y-1 border-t border-border pt-2">
                <p className="text-xs font-semibold text-foreground">Clock Out</p>
                <p className="text-xs text-muted-foreground">Timestamp: {formatDateTime(shift.clock_out_time)}</p>
                {shift.clock_out_lat != null && shift.clock_out_lng != null && shift.client.lat != null && shift.client.lng != null && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Distance from client: {formatDistanceMiles(getDistanceMeters({ lat: shift.clock_out_lat, lng: shift.clock_out_lng }, { lat: shift.client.lat, lng: shift.client.lng }))}
                    </p>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${shift.clock_out_lat},${shift.clock_out_lng}&destination=${shift.client.lat},${shift.client.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      View on map <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
                <p className="text-xs text-muted-foreground">Geofence radius: {formatDistanceMiles(MAX_DISTANCE_METERS)}</p>
                {(shift as any).clock_out_accuracy != null && (
                  <p className="text-xs text-muted-foreground">GPS accuracy: ±{Math.round(metersToFeet((shift as any).clock_out_accuracy))} ft</p>
                )}
              </div>
            )}
          </div>
        )}

        {(shift as any).assignment_status === "pending" && status === "not_started" && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">This shift is awaiting your response</p>
            <div className="flex gap-3">
              <button
                onClick={() => updateAssignment.mutate({ id: shift.id, assignment_status: "accepted" })}
                disabled={updateAssignment.isPending}
                className="flex-1 py-3 rounded-2xl gradient-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
              >
                Accept Shift
              </button>
              <button
                onClick={() => updateAssignment.mutate({ id: shift.id, assignment_status: "declined" })}
                disabled={updateAssignment.isPending}
                className="flex-1 py-3 rounded-2xl border border-border text-sm font-bold text-foreground disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {(shift as any).assignment_status === "declined" && (
          <div className="w-full py-3 rounded-2xl bg-destructive/10 text-destructive text-sm font-bold text-center">
            You declined this shift — admin has been notified.
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
          <div className="border-t border-border" />
          <button
            onClick={() => navigate(`/messages/new?shiftId=${id}`)}
            className="w-full flex items-center justify-between py-3"
          >
            <span className="text-base text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Message about this shift
            </span>
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
                <MapPin className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Confirm Clock In</h3>
              <p className="text-sm text-muted-foreground mt-2">
                You are clocking in for <strong>{shift.client.name}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">📍 Your GPS location will be verified against the client's address</p>
              {locationError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mt-3 text-left">
                  <p className="text-xs text-destructive leading-relaxed">{locationError}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowConfirm(false); setLocationError(null); }} className="flex-1 py-3.5 rounded-xl border border-border text-sm font-semibold text-foreground">
                Cancel
              </button>
              <button
                onClick={confirmClockIn}
                disabled={verifyingLocation}
                className="flex-1 py-3.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
              >
                {verifyingLocation ? (
                  <span className="flex items-center justify-center gap-1">
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                  </span>
                ) : "Confirm"}
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
