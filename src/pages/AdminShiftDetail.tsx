import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, User, Navigation, AlertTriangle, CheckCircle2, Download, ShieldAlert, Phone, FileText, ClipboardList } from "lucide-react";
import { useShift } from "@/hooks/useShifts";
import { useAdminClient } from "@/hooks/useAdminClient";
import { getDistanceMeters, MAX_DISTANCE_METERS } from "@/hooks/useGeolocation";
import { Skeleton } from "@/components/ui/skeleton";
import MobileLayout from "@/components/layout/MobileLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  evaluateShiftSuspicion,
  buildCaregiverFailureCounts,
  ACCURACY_THRESHOLD_METERS,
} from "@/lib/suspiciousShift";
import { useAgencySettings } from "@/hooks/useAgencySettings";
import { formatDate, formatTime, formatDateTime } from "@/lib/format";
import { useCareNoteAudits } from "@/hooks/useCareNoteAudits";
import { History } from "lucide-react";
import ShiftTasksList from "@/components/shifts/ShiftTasksList";

function useCaregiverFailureHistory(
  caregiverId: string | null | undefined,
  thresholds?: { geofence_radius_m: number; accuracy_threshold_m: number; repeat_failure_threshold: number },
) {
  return useQuery({
    queryKey: ["caregiver-failure-history", caregiverId, thresholds],
    enabled: !!caregiverId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("id, date, start_time, clock_in_lat, clock_in_lng, clock_out_lat, clock_out_lng, clock_in_accuracy, clock_out_accuracy, caregiver_id, client:clients(id, name, lat, lng)")
        .eq("caregiver_id", caregiverId!)
        .order("date", { ascending: false })
        .limit(50);
      if (error) throw error;
      const counts = buildCaregiverFailureCounts((data ?? []) as any, thresholds);
      const failed = ((data ?? []) as any[]).filter((s) => {
        const r = evaluateShiftSuspicion(s, counts.get(s.caregiver_id) ?? 0, thresholds);
        return r.suspicious;
      });
      return { count: counts.get(caregiverId!) ?? 0, failed };
    },
  });
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function DistanceBadge({ distance }: { distance: number }) {
  const isSuspicious = distance > MAX_DISTANCE_METERS;
  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
      isSuspicious
        ? "bg-destructive/15 text-destructive"
        : "bg-success/15 text-success"
    }`}>
      {isSuspicious ? (
        <AlertTriangle className="w-3.5 h-3.5" />
      ) : (
        <CheckCircle2 className="w-3.5 h-3.5" />
      )}
      {formatDistance(distance)} from client
      {isSuspicious && " — Suspicious"}
    </div>
  );
}

function exportShiftCSV(shift: any) {
  const rows = [
    ["Field", "Value"],
    ["Shift ID", shift.id],
    ["Client", shift.client.name],
    ["Address", shift.client.address],
    ["Date", shift.date],
    ["Scheduled", `${shift.start_time} – ${shift.end_time}`],
    ["Status", shift.status],
    ["Clock-In Time", shift.clock_in_time || "N/A"],
    ["Clock-In Lat", shift.clock_in_lat ?? "N/A"],
    ["Clock-In Lng", shift.clock_in_lng ?? "N/A"],
    ["Clock-Out Time", shift.clock_out_time || "N/A"],
    ["Clock-Out Lat", shift.clock_out_lat ?? "N/A"],
    ["Clock-Out Lng", shift.clock_out_lng ?? "N/A"],
    ["Client Lat", shift.client.lat ?? "N/A"],
    ["Client Lng", shift.client.lng ?? "N/A"],
    ["Clock-Out Notes", shift.clock_out_notes || "N/A"],
    ["Admin Notes", shift.admin_notes || "N/A"],
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `shift-audit-${shift.id.slice(0, 8)}-${shift.date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const AdminShiftDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: shift, isLoading } = useShift(id);
  const {
    data: fullClient,
    isLoading: isLoadingClient,
    isError: isClientError,
    error: clientError,
  } = useAdminClient(shift?.client_id, shift?.id);
  const { data: settings } = useAgencySettings();
  const thresholds = settings
    ? {
        geofence_radius_m: settings.geofence_radius_m,
        accuracy_threshold_m: settings.accuracy_threshold_m,
        repeat_failure_threshold: settings.repeat_failure_threshold,
      }
    : undefined;
  const { data: failureHistory } = useCaregiverFailureHistory(shift?.caregiver_id ?? null, thresholds);
  const { data: noteAudits } = useCareNoteAudits(shift?.id);

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="px-5 py-5 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-60 rounded-2xl" />
        </div>
      </MobileLayout>
    );
  }

  if (!shift) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Shift not found</p>
        </div>
      </MobileLayout>
    );
  }

  const hasClockInGPS = shift.clock_in_lat != null && shift.clock_in_lng != null;
  const hasClockOutGPS = shift.clock_out_lat != null && shift.clock_out_lng != null;
  const hasClientGPS = shift.client.lat != null && shift.client.lng != null;

  const clockInDistance = hasClockInGPS && hasClientGPS
    ? getDistanceMeters(
        { lat: shift.clock_in_lat!, lng: shift.clock_in_lng! },
        { lat: shift.client.lat!, lng: shift.client.lng! }
      )
    : null;

  const clockOutDistance = hasClockOutGPS && hasClientGPS
    ? getDistanceMeters(
        { lat: shift.clock_out_lat!, lng: shift.clock_out_lng! },
        { lat: shift.client.lat!, lng: shift.client.lng! }
      )
    : null;

  const renderMapEmbed = (lat: number, lng: number, label: string) => (
    <iframe
      title={label}
      width="100%"
      height="200"
      style={{ border: 0, borderRadius: "16px" }}
      loading="lazy"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.003},${lng + 0.005},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`}
    />
  );

  const statusStyles: Record<string, { label: string; className: string }> = {
    not_started: { label: "Not Started", className: "bg-muted text-muted-foreground" },
    in_progress: { label: "In Progress", className: "bg-primary/15 text-primary" },
    completed: { label: "Completed", className: "bg-success/15 text-success" },
    missed: { label: "Missed", className: "bg-destructive/15 text-destructive" },
  };

  const st = statusStyles[shift.status] ?? statusStyles.not_started;

  const suspicion = evaluateShiftSuspicion(shift as any, failureHistory?.count ?? 0, thresholds);
  const sAny = shift as any;

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-primary font-medium flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h2 className="text-lg font-bold text-foreground">Shift Audit</h2>
          </div>
          <button
            onClick={() => exportShiftCSV(shift)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold hover:bg-accent transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>

        {suspicion.suspicious && (
          <aside className={`rounded-2xl border-2 p-4 space-y-3 ${suspicion.severity === "high" ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5"}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${suspicion.severity === "high" ? "text-destructive" : "text-warning"}`} />
              <h3 className="text-sm font-bold text-card-foreground">Why this visit is flagged</h3>
              <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${suspicion.severity === "high" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                {suspicion.severity}
              </span>
            </div>
            <ul className="text-xs text-card-foreground list-disc list-inside space-y-1">
              {suspicion.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
            <div className="text-xs text-muted-foreground border-t border-border pt-2 space-y-1">
              <p><strong className="text-card-foreground">Geofence radius:</strong> {thresholds?.geofence_radius_m ?? MAX_DISTANCE_METERS} m</p>
              {clockInDistance != null && (
                <p><strong className="text-card-foreground">Clock-in distance:</strong> {Math.round(clockInDistance)} m{clockInDistance > (thresholds?.geofence_radius_m ?? MAX_DISTANCE_METERS) ? " (outside)" : ""}</p>
              )}
              {clockOutDistance != null && (
                <p><strong className="text-card-foreground">Clock-out distance:</strong> {Math.round(clockOutDistance)} m{clockOutDistance > (thresholds?.geofence_radius_m ?? MAX_DISTANCE_METERS) ? " (outside)" : ""}</p>
              )}
              {sAny.clock_in_accuracy != null && (
                <p><strong className="text-card-foreground">Clock-in GPS accuracy:</strong> ±{Math.round(sAny.clock_in_accuracy)} m{sAny.clock_in_accuracy > (thresholds?.accuracy_threshold_m ?? ACCURACY_THRESHOLD_METERS) ? " (low)" : ""}</p>
              )}
              {sAny.clock_out_accuracy != null && (
                <p><strong className="text-card-foreground">Clock-out GPS accuracy:</strong> ±{Math.round(sAny.clock_out_accuracy)} m{sAny.clock_out_accuracy > (thresholds?.accuracy_threshold_m ?? ACCURACY_THRESHOLD_METERS) ? " (low)" : ""}</p>
              )}
            </div>
            {failureHistory && (
              <div className="text-xs border-t border-border pt-2 space-y-1">
                <p className="text-card-foreground font-semibold">
                  Caregiver geofence failure history: {failureHistory.count} flagged shift{failureHistory.count === 1 ? "" : "s"} (last 50)
                </p>
                {failureHistory.failed.slice(0, 5).map((f: any) => (
                  <p key={f.id} className="text-muted-foreground">
                    • {formatDate(f.date)} {formatTime(f.start_time)} — {f.client?.name ?? "Unknown client"}
                  </p>
                ))}
              </div>
            )}
          </aside>
        )}

        {/* Shift Info */}
        <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-card-foreground">{shift.client.name}</h3>
                <p className="text-xs text-muted-foreground">{shift.client.address}</p>
              </div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.className}`}>{st.label}</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>📅 {formatDate(shift.date)} · {formatTime(shift.start_time)} – {formatTime(shift.end_time)}</p>
            <p>🏥 {shift.client.care_type}</p>
            {shift.admin_notes && <p>📝 {shift.admin_notes}</p>}
          </div>
        </div>

        {/* Clock-In Location */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Navigation className="w-4 h-4 text-success" />
            <h3 className="text-sm font-bold text-card-foreground">Clock-In Location</h3>
          </div>
          <div className="p-4 space-y-3">
            {hasClockInGPS ? (
              <>
                {clockInDistance != null && <DistanceBadge distance={clockInDistance} />}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-success" />
                  <span>Lat: {shift.clock_in_lat!.toFixed(6)}, Lng: {shift.clock_in_lng!.toFixed(6)}</span>
                </div>
                {shift.clock_in_time && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDateTime(shift.clock_in_time)}</span>
                  </div>
                )}
                {renderMapEmbed(shift.clock_in_lat!, shift.clock_in_lng!, "Clock-in location")}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No GPS data recorded at clock-in</p>
            )}
          </div>
        </div>

        {/* Clock-Out Location */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Navigation className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-bold text-card-foreground">Clock-Out Location</h3>
          </div>
          <div className="p-4 space-y-3">
            {hasClockOutGPS ? (
              <>
                {clockOutDistance != null && <DistanceBadge distance={clockOutDistance} />}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-destructive" />
                  <span>Lat: {shift.clock_out_lat!.toFixed(6)}, Lng: {shift.clock_out_lng!.toFixed(6)}</span>
                </div>
                {shift.clock_out_time && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDateTime(shift.clock_out_time)}</span>
                  </div>
                )}
                {renderMapEmbed(shift.clock_out_lat!, shift.clock_out_lng!, "Clock-out location")}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No GPS data recorded at clock-out</p>
            )}
          </div>
        </div>

        {/* Client Location Reference */}
        {hasClientGPS && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent-foreground" />
              <h3 className="text-sm font-bold text-card-foreground">Client Location (Reference)</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>Lat: {shift.client.lat!.toFixed(6)}, Lng: {shift.client.lng!.toFixed(6)}</span>
              </div>
              {renderMapEmbed(shift.client.lat!, shift.client.lng!, "Client location")}
            </div>
          </div>
        )}

        {/* Clock-Out Notes */}
        {shift.clock_out_notes && (
          <div className="bg-card rounded-2xl p-4 border border-border">
            <h3 className="text-sm font-bold text-card-foreground mb-2">Clock-Out Notes</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{shift.clock_out_notes}</p>
          </div>
        )}

        {/* Care Notes Audit Trail */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-card-foreground">Care-Notes Edit History</h3>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {noteAudits?.length ?? 0} {(noteAudits?.length ?? 0) === 1 ? "change" : "changes"}
            </span>
          </div>
          {!noteAudits || noteAudits.length === 0 ? (
            <div className="p-6 text-center space-y-1">
              <p className="text-sm font-medium text-card-foreground">No care-note edits yet</p>
              <p className="text-xs text-muted-foreground">
                Any changes to this shift's clock-out notes will appear here with the editor's name, timestamp, and full before/after values.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {noteAudits.map((a) => (
                <li key={a.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-card-foreground">
                      {a.changer_name || (a.changed_by ? a.changed_by.slice(0, 8) : "System")}
                    </span>
                    <span>{formatDateTime(a.changed_at)}</span>
                  </div>
                  <div className="grid gap-2 text-xs">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Before</p>
                      <p className="rounded-lg bg-destructive/5 border border-destructive/20 px-2.5 py-1.5 text-card-foreground whitespace-pre-wrap">
                        {a.old_value?.trim() ? a.old_value : <em className="text-muted-foreground">(empty)</em>}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">After</p>
                      <p className="rounded-lg bg-success/5 border border-success/20 px-2.5 py-1.5 text-card-foreground whitespace-pre-wrap">
                        {a.new_value?.trim() ? a.new_value : <em className="text-muted-foreground">(empty)</em>}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Admin-only: Emergency Contact & Care Plan */}
        <div className="bg-card rounded-2xl border border-destructive/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-destructive/5">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-bold text-card-foreground">Emergency Contact (Admin Only)</h3>
          </div>
          <div className="p-4 space-y-3 text-sm">
            {isLoadingClient ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Skeleton className="w-4 h-4 mt-0.5 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Skeleton className="w-4 h-4 mt-0.5 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-border">
                  <Skeleton className="w-4 h-4 mt-0.5 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </div>
            ) : isClientError ? (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-destructive font-semibold">Failed to load client details</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {clientError instanceof Error ? clientError.message : "Please try again or check your admin permissions."}
                  </p>
                </div>
              </div>
            ) : fullClient ? (
              <>
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="text-card-foreground font-medium">
                      {fullClient.emergency_contact || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    {fullClient.emergency_phone ? (
                      <a
                        href={`tel:${fullClient.emergency_phone}`}
                        className="text-primary font-medium hover:underline"
                      >
                        {fullClient.emergency_phone}
                      </a>
                    ) : (
                      <p className="text-card-foreground">—</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-border">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Care Plan Summary</p>
                    <p className="text-card-foreground leading-relaxed whitespace-pre-wrap">
                      {fullClient.care_plan_summary || "—"}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">No client details available.</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-card-foreground">Care Tasks</h3>
          </div>
          <ShiftTasksList shiftId={String((shift as any)?.id ?? "")} canManage />
        </div>
      </div>
    </MobileLayout>
  );
};

export default AdminShiftDetail;
