import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, User, MapPin, Loader2, MessageSquare, ExternalLink, CheckCircle2, RefreshCw, ShieldCheck, HelpCircle, Navigation, Calendar, Clock, Briefcase, FileText, Sun, TimerReset, Upload, Paperclip, History, AlertCircle } from "lucide-react";
import { useShift, useUpdateShiftStatus, useUpdateAssignmentStatus } from "@/hooks/useShifts";
import { getCurrentPosition, getDistanceMeters, MAX_DISTANCE_METERS, formatDistanceMiles, metersToFeet } from "@/hooks/useGeolocation";
import ClockOutForm from "@/components/shifts/ClockOutForm";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { formatTime, formatDateTime, formatDateLong } from "@/lib/format";
import LiveLocationStatus from "@/components/LiveLocationStatus";
import { useAgencySettings } from "@/hooks/useAgencySettings";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { openDirections } from "@/lib/directions";
import { useVisitHistory, useShiftDocuments, useUploadShiftDocument, validateDocFile, MAX_DOC_BYTES } from "@/hooks/useShiftDocuments";
import CareSummaryPreview from "@/components/shifts/CareSummaryPreview";

const ShiftDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: shift, isLoading } = useShift(id);
  const { data: settings } = useAgencySettings();
  const liveLocation = useLiveLocation();
  const updateStatus = useUpdateShiftStatus();
  const updateAssignment = useUpdateAssignmentStatus();
  const { data: visitHistory = [] } = useVisitHistory(shift?.client?.id, id);
  const { data: shiftDocs = [] } = useShiftDocuments(id);
  const uploadDoc = useUploadShiftDocument();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
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

  // Simulated progress while upload is in-flight (supabase-js v2 doesn't expose progress)
  useEffect(() => {
    if (!uploadDoc.isPending) return;
    setUploadProgress(8);
    const i = setInterval(() => {
      setUploadProgress((p) => (p < 90 ? p + Math.max(1, (90 - p) / 12) : p));
    }, 250);
    return () => clearInterval(i);
  }, [uploadDoc.isPending]);

  const startUpload = (file: File) => {
    const err = validateDocFile(file);
    if (err) {
      setUploadError(err);
      setPendingFile(file);
      toast.error(err);
      return;
    }
    setUploadError(null);
    setPendingFile(file);
    setUploadProgress(5);
    uploadDoc.mutate(
      { shiftId: id!, file },
      {
        onSuccess: () => {
          setUploadProgress(100);
          setPendingFile(null);
          setTimeout(() => setUploadProgress(0), 600);
        },
        onError: (e: any) => {
          setUploadError(e?.message ?? "Upload failed");
          setUploadProgress(0);
        },
      },
    );
  };

  useEffect(() => {
    if (!retryReady) return;
    setRetryStartedAt(null);
    setLocationError(null);
    if (status === "not_started") {
      confirmClockIn();
    } else if (status === "in_progress") {
      verifyLocationAndProceed(() => navigate(`/shifts/${shift!.id}/care-notes`));
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
      navigate(`/shifts/${shift.id}/care-notes`);
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
      {/* Top bar */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center px-5 pt-5 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 -ml-1 inline-flex items-center justify-center rounded-full text-foreground/90 hover:bg-secondary/60 active:scale-95 transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-center text-base font-semibold text-foreground tracking-wide">
          {status === "completed" ? "Shift Complete" : status === "in_progress" ? "Clock Out" : "Clock In"}
        </h1>
        <button
          onClick={() => navigate(`/messages/new?shiftId=${id}`)}
          className="inline-flex items-center gap-1.5 text-primary text-sm font-medium px-2 py-1 rounded-full hover:bg-primary/10"
        >
          Help <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 pb-36 space-y-6">
        {/* Location verified */}
        <div className="flex flex-col items-center text-center gap-1 pt-2">
          <div className="inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-foreground">
              {clientHasLocation ? "Location verified" : "Location not configured"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-[18rem]">{shift.client.address}</p>
        </div>

        {/* Hero clock button */}
        {status !== "completed" && status !== "missed" && (
          <div className="flex justify-center pt-2">
            <button
              onClick={status === "not_started" ? handleClockIn : handleClockOut}
              disabled={updateStatus.isPending || verifyingLocation}
              className="relative w-64 h-64 rounded-full disabled:opacity-60 active:scale-[0.98] transition-transform group"
              aria-label={status === "not_started" ? "Clock In" : "Clock Out"}
            >
              {/* outer dotted ring */}
              <span className="absolute inset-0 rounded-full border border-dashed border-primary/40" />
              {/* glowing solid ring */}
              <span
                className="absolute inset-3 rounded-full border-[3px] border-primary"
                style={{ boxShadow: "0 0 50px hsl(var(--primary) / 0.45), inset 0 0 30px hsl(var(--primary) / 0.25)" }}
              />
              {/* inner content */}
              <span className="absolute inset-3 rounded-full bg-background/40 flex flex-col items-center justify-center gap-2 px-6">
                {verifyingLocation ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : status === "in_progress" ? (
                  <TimerReset className="w-8 h-8 text-primary" />
                ) : (
                  <Clock className="w-8 h-8 text-primary" />
                )}
                <span className="font-display text-4xl font-bold text-foreground leading-none mt-1">
                  {verifyingLocation ? "Verifying" : status === "not_started" ? "Clock In" : "Clock Out"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {status === "not_started" ? "Start your shift" : "End your shift"}
                </span>
              </span>
            </button>
          </div>
        )}

        {status === "completed" && (
          <div className="mx-auto w-fit inline-flex items-center gap-2 px-5 py-3 rounded-full bg-success/15 text-success font-semibold">
            <CheckCircle2 className="w-5 h-5" /> Shift completed
          </div>
        )}

        {/* Care summary preview (shown once submitted) */}
        <CareSummaryPreview shiftId={shift.id} />

        {/* Geofence helper */}
        {status !== "completed" && (
          <div className="flex items-start gap-2 justify-center text-center">
            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground max-w-xs">
              You must be within {Math.round(metersToFeet(MAX_DISTANCE_METERS))} ft of your client's location to clock {status === "in_progress" ? "out" : "in"}.
            </p>
          </div>
        )}

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

        {/* Today's schedule card */}
        <section className="rounded-2xl bg-card border border-border/60 p-5 shadow-lg shadow-background/40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold tracking-[0.14em] text-primary uppercase">Today's Schedule</h2>
            <button
              onClick={() => navigate("/shifts")}
              className="text-sm font-medium text-primary inline-flex items-center gap-0.5 hover:underline"
            >
              View full schedule <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl font-semibold text-foreground truncate">{shift.client.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{formatTime(shift.start_time)} – {formatTime(shift.end_time)}</p>
              <p className="text-sm text-muted-foreground leading-snug truncate">{shift.client.address}</p>
            </div>
            {(shift.client.lat != null || !!shift.client.address) && (
              <button
                type="button"
                onClick={() =>
                  openDirections({
                    lat: shift.client.lat,
                    lng: shift.client.lng,
                    address: shift.client.address,
                    label: shift.client.name,
                  })
                }
                className="flex flex-col items-center gap-1 shrink-0 active:scale-95 transition-transform"
                aria-label={`Directions to ${shift.client.name}`}
              >
                <span className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center ring-1 ring-primary/20">
                  <Navigation className="w-5 h-5 text-primary" />
                </span>
                <span className="text-xs text-foreground/80">Directions</span>
              </button>
            )}
          </div>
        </section>

        {/* Shift details card */}
        <section className="rounded-2xl bg-card border border-border/60 p-5 shadow-lg shadow-background/40">
          <h2 className="text-xs font-bold tracking-[0.14em] text-primary uppercase mb-3">Shift Details</h2>
          <dl className="divide-y divide-border/60">
            <DetailRow icon={Calendar} label="Date" value={formatDateLong(shift.date)} />
            <DetailRow
              icon={Clock}
              label="Scheduled"
              value={`${formatTime(shift.start_time)} – ${formatTime(shift.end_time)}`}
            />
            <DetailRow icon={Briefcase} label="Position" value="Caregiver" />
            <DetailRow icon={FileText} label="Shift type" value={shift.client.care_type || "Personal Care"} />
            {shift.admin_notes && (
              <DetailRow icon={FileText} label="Notes" value={shift.admin_notes} multiline />
            )}
          </dl>
        </section>

        {/* Visit Documentation */}
        <section className="rounded-2xl bg-card border border-border/60 p-5 shadow-lg shadow-background/40">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
              Visit Documentation
            </h2>
            {shiftDocs.length > 0 && (
              <span className="text-xs text-muted-foreground">{shiftDocs.length} file{shiftDocs.length === 1 ? "" : "s"}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Attach signed forms, photos of care plans, or any documentation specific to this visit.
          </p>

          {shiftDocs.length > 0 && (
            <ul className="divide-y divide-border/60 mb-3">
              {shiftDocs.map((doc: any) => (
                <li key={doc.id} className="py-2.5 flex items-center gap-3">
                  <Paperclip className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {doc.file_path?.split("/").pop() ?? "Document"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(doc.uploaded_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {uploadDoc.isPending && pendingFile && (
            <div className="mb-3 rounded-xl bg-secondary/40 border border-border/60 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                <p className="text-xs text-foreground truncate flex-1">{pendingFile.name}</p>
                <span className="text-[11px] text-muted-foreground">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="h-1.5 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {uploadError && !uploadDoc.isPending && (
            <div className="mb-3 rounded-xl bg-destructive/10 border border-destructive/20 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-destructive">Upload failed</p>
                  <p className="text-[11px] text-destructive/80 mt-0.5 leading-relaxed">{uploadError}</p>
                  {pendingFile && (
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">{pendingFile.name}</p>
                  )}
                </div>
              </div>
              {pendingFile && !validateDocFile(pendingFile) && (
                <button
                  type="button"
                  onClick={() => startUpload(pendingFile)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry upload
                </button>
              )}
              <button
                type="button"
                onClick={() => { setUploadError(null); setPendingFile(null); }}
                className="w-full text-[11px] text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          )}

          <label
            htmlFor="visit-doc-upload"
            className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-sm font-semibold text-primary cursor-pointer hover:bg-primary/10 transition ${
              uploadDoc.isPending ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            {uploadDoc.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploadDoc.isPending ? "Uploading…" : "Upload document"}
          </label>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            JPG, PNG, HEIC, PDF, DOC · up to {Math.round(MAX_DOC_BYTES / 1024 / 1024)} MB
          </p>
          <input
            id="visit-doc-upload"
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && id) startUpload(file);
              e.target.value = "";
            }}
          />
        </section>

        {/* Visit History preview */}
        {visitHistory.length > 0 && (
          <section className="rounded-2xl bg-card border border-border/60 p-5 shadow-lg shadow-background/40">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
                Recent Visits
              </h2>
              <button
                type="button"
                onClick={() => navigate("/shifts")}
                className="text-sm font-medium text-primary inline-flex items-center gap-0.5 hover:underline"
              >
                View all <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <ul className="divide-y divide-border/60">
              {visitHistory.map((v: any) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/shifts/${v.id}`)}
                    className="w-full flex items-center gap-3 py-3 text-left"
                  >
                    <span className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <History className="w-4 h-4 text-primary" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatDateLong(v.date)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(v.start_time)} – {formatTime(v.end_time)}
                        {v.clock_out_notes ? " · Notes on file" : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Tip */}
        {status === "not_started" && (
          <button
            type="button"
            className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border/60 p-4 text-left active:scale-[0.99] transition"
          >
            <span className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5 text-primary" />
            </span>
            <span className="flex-1 text-sm text-foreground/90 leading-snug">
              <span className="font-semibold">Tip:</span> Clock in 5–10 minutes before your visit to review the care plan.
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
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

        {/* Shift actions */}
        <section className="rounded-2xl bg-card border border-border/60 overflow-hidden">
          <button
            onClick={() => navigate(`/shifts/${id}/swap`)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition"
          >
            <span className="flex items-center gap-3 text-foreground">
              <RefreshCw className="w-4 h-4 text-primary" /> Swap shift
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="border-t border-border/60" />
          <button
            onClick={() => navigate(`/messages/new?shiftId=${id}`)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition"
          >
            <span className="flex items-center gap-3 text-foreground">
              <MessageSquare className="w-4 h-4 text-primary" /> Message about this shift
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </section>

        <div className="flex justify-center pt-1">
          <LiveLocationStatus compact />
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

function DetailRow({
  icon: Icon,
  label,
  value,
  multiline,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-foreground flex-1 ${multiline ? "" : "text-right"}`}>
        {value}
      </span>
    </div>
  );
}
