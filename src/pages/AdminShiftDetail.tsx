import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Camera, Clock, User, Navigation } from "lucide-react";
import { useShift } from "@/hooks/useShifts";
import { Skeleton } from "@/components/ui/skeleton";
import MobileLayout from "@/components/layout/MobileLayout";

const AdminShiftDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: shift, isLoading } = useShift(id);

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
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-primary font-medium flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-lg font-bold text-foreground">Shift Audit</h2>
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
            {hasSelfie ? (
              <img
                src={shift.clock_in_selfie_url!}
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
      </div>
    </MobileLayout>
  );
};

export default AdminShiftDetail;
