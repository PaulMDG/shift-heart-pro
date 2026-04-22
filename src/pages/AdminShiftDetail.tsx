import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Camera, Clock, User, Navigation, AlertTriangle, CheckCircle2, Download, ShieldAlert, Phone, FileText } from "lucide-react";
import { useShift } from "@/hooks/useShifts";
import { useAdminClient } from "@/hooks/useAdminClient";
import { getDistanceMeters, MAX_DISTANCE_METERS } from "@/hooks/useGeolocation";
import { useSignedSelfieUrl } from "@/hooks/useSignedSelfieUrl";
import { Skeleton } from "@/components/ui/skeleton";
import MobileLayout from "@/components/layout/MobileLayout";

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
    ["Selfie URL", shift.clock_in_selfie_url || "N/A"],
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
  const selfieUrl = useSignedSelfieUrl(shift?.clock_in_selfie_url);
  const { data: fullClient } = useAdminClient(shift?.client_id);

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
  const hasSelfie = !!shift.clock_in_selfie_url;

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
            <p>📅 {shift.date} · {shift.start_time} – {shift.end_time}</p>
            <p>🏥 {shift.client.care_type}</p>
            {shift.admin_notes && <p>📝 {shift.admin_notes}</p>}
          </div>
        </div>

        {/* Verification Selfie */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-card-foreground">Verification Selfie</h3>
          </div>
          <div className="p-4">
            {hasSelfie && selfieUrl ? (
              <img
                src={selfieUrl}
                alt="Clock-in verification selfie"
                className="w-full rounded-xl object-cover max-h-64"
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No selfie captured for this shift</p>
            )}
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
                    <span>{new Date(shift.clock_in_time).toLocaleString()}</span>
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
                    <span>{new Date(shift.clock_out_time).toLocaleString()}</span>
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

        {/* Admin-only: Emergency Contact & Care Plan */}
        <div className="bg-card rounded-2xl border border-destructive/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-destructive/5">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-bold text-card-foreground">Emergency Contact (Admin Only)</h3>
          </div>
          <div className="p-4 space-y-3 text-sm">
            {fullClient ? (
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
              <p className="text-muted-foreground text-center py-4">Loading client details…</p>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default AdminShiftDetail;
