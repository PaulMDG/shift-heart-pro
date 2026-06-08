import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, FileText, Camera, Mic, MicOff, Plus, X, Eye, EyeOff, Loader2, CheckCircle2, Image as ImageIcon, Clock, ShieldCheck, ShieldAlert, MapPin, Lock, AlertTriangle, RefreshCw } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useShift, useUpdateShiftStatus } from "@/hooks/useShifts";
import { useCareSummary, useUpsertCareSummary, useQuickNoteTemplates, useAddQuickNoteTemplate, DEFAULT_QUICK_NOTES } from "@/hooks/useCareSummary";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { getCurrentPosition, getDistanceMeters, MAX_DISTANCE_METERS, formatDistanceMiles, metersToFeet } from "@/hooks/useGeolocation";
import { useAgencySettings } from "@/hooks/useAgencySettings";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import CareSummaryVersions from "@/components/shifts/CareSummaryVersions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/format";

const MEALS = ["Full", "Partial", "Refused"];
const MEDS = ["Given", "Refused", "N/A"];
const HYDRATION = ["Adequate", "Low"];
const BOWEL = ["Normal", "None", "Issue"];
const INCIDENT = ["None", "Minor", "Moderate", "Major"];

const CareNotesPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: shift, isLoading: shiftLoading } = useShift(id);
  const { data: existing } = useCareSummary(id);
  const { data: customTemplates = [] } = useQuickNoteTemplates();
  const addTemplate = useAddQuickNoteTemplate();
  const upsert = useUpsertCareSummary();
  const updateStatus = useUpdateShiftStatus();
  const recorder = useVoiceRecorder();
  const { data: settings } = useAgencySettings();
  const liveLoc = useLiveLocation();

  const [meals, setMeals] = useState<string | null>(null);
  const [meds, setMeds] = useState<string | null>(null);
  const [medsCount, setMedsCount] = useState<string>("");
  const [hydration, setHydration] = useState<string | null>(null);
  const [bowel, setBowel] = useState<string | null>(null);
  const [mobility, setMobility] = useState<boolean | null>(null);
  const [incident, setIncident] = useState<string | null>("None");
  const [incidentNote, setIncidentNote] = useState("");
  const [notes, setNotes] = useState("");
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"family_care_team" | "care_team_only">("family_care_team");
  const [uploading, setUploading] = useState(false);
  const [showAddTpl, setShowAddTpl] = useState(false);
  const [newTplLabel, setNewTplLabel] = useState("");
  const [newTplContent, setNewTplContent] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [verifying, setVerifying] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    ok: boolean;
    accuracyM: number | null;
    distanceM: number | null;
    accuracyThresholdM: number;
    distanceThresholdM: number;
    reason?: string;
    timestamp: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const approved = (shift as any)?.timesheet_status === "approved";
  const accuracyThreshold = settings?.accuracy_threshold_m ?? 100;

  // Live, pre-submission distance/accuracy preview (passive — no extra GPS prompts)
  const liveDistanceM = useMemo(() => {
    if (!liveLoc.position || !shift?.client?.lat || !shift?.client?.lng) return null;
    return getDistanceMeters(liveLoc.position, { lat: shift.client.lat, lng: shift.client.lng });
  }, [liveLoc.position, shift?.client?.lat, shift?.client?.lng]);
  const liveAccuracyM = liveLoc.accuracy ?? null;
  const liveAccuracyOk = liveAccuracyM != null && liveAccuracyM <= accuracyThreshold;
  const liveDistanceOk = liveDistanceM != null && liveDistanceM <= MAX_DISTANCE_METERS;

  useEffect(() => {
    if (!existing) return;
    setMeals(existing.meals_status);
    setMeds(existing.medications_status);
    setMedsCount(existing.medications_count?.toString() ?? "");
    setHydration(existing.hydration);
    setBowel(existing.bowel_movement);
    setMobility(existing.mobility_assisted);
    setIncident(existing.incident_severity ?? "None");
    setIncidentNote(existing.incident_note ?? "");
    setNotes(existing.notes_text ?? "");
    setVoiceUrl(existing.voice_url);
    setPhotos(existing.photo_urls ?? []);
    setVisibility((existing.visibility as any) ?? "family_care_team");
  }, [existing]);

  useEffect(() => {
    if (shift?.status !== "in_progress") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [shift?.status]);

  const checklist = [
    { key: "meals", done: !!meals },
    { key: "meds", done: !!meds },
    { key: "hydration", done: !!hydration },
    { key: "bowel", done: !!bowel },
    { key: "mobility", done: mobility !== null },
    { key: "incident", done: !!incident },
  ];
  const progress = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);

  const remainingMs = useMemo(() => {
    if (!shift) return 0;
    const [eh, em] = shift.end_time.split(":").map(Number);
    const end = new Date(`${shift.date}T${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}:00`).getTime();
    return end - now;
  }, [shift, now]);

  const fmtRemaining = () => {
    const abs = Math.abs(remainingMs);
    const h = Math.floor(abs / 3600000);
    const m = Math.floor((abs % 3600000) / 60000);
    const s = Math.floor((abs % 60000) / 1000);
    const text = h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, "0")}`;
    return remainingMs < 0 ? `+${text} over` : text;
  };

  const applyTemplate = (content: string) => {
    setNotes((prev) => (prev ? `${prev}\n${content}` : content));
  };

  const handlePhoto = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;
    setUploading(true);
    try {
      const path = `${user.id}/${id}/photo-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("care-note-media").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("care-note-media").createSignedUrl(path, 60 * 60 * 24 * 30);
      if (signed?.signedUrl) setPhotos((p) => [...p, signed.signedUrl]);
      toast.success("Photo added");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const stopVoice = async () => {
    const out = await recorder.stop();
    if (!out) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;
    setUploading(true);
    try {
      const ext = out.mime.includes("mp4") ? "m4a" : "webm";
      const path = `${user.id}/${id}/voice-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("care-note-media").upload(path, out.blob, { contentType: out.mime });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("care-note-media").createSignedUrl(path, 60 * 60 * 24 * 30);
      if (signed?.signedUrl) setVoiceUrl(signed.signedUrl);
      toast.success(`Voice note saved (${out.duration}s)`);
    } catch (e: any) {
      toast.error(e.message ?? "Voice upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!id || !shift) return;
    if (approved) {
      toast.error("This shift's timesheet has been approved — care notes are locked.");
      return;
    }
    if (progress < 100) {
      toast.error("Complete every care summary item before submitting.");
      return;
    }
    let clockOutPos: { lat: number; lng: number; accuracy: number } | null = null;
    if (shift.status === "in_progress") {
      if (shift.client.lat == null || shift.client.lng == null) {
        const msg = "Client location is not configured. Contact your administrator before clocking out.";
        setGpsError(msg);
        setVerifyResult({ ok: false, accuracyM: null, distanceM: null, accuracyThresholdM: accuracyThreshold, distanceThresholdM: MAX_DISTANCE_METERS, reason: msg, timestamp: new Date().toISOString() });
        toast.error(msg); return;
      }
      setGpsError(null); setVerifying(true);
      try {
        const pos = await getCurrentPosition();
        if (pos.accuracy == null || pos.accuracy > accuracyThreshold) {
          const msg = `GPS accuracy is too low (±${Math.round(metersToFeet(pos.accuracy ?? 0))} ft). Required ±${Math.round(metersToFeet(accuracyThreshold))} ft or better.`;
          setGpsError(msg);
          setVerifyResult({ ok: false, accuracyM: pos.accuracy ?? null, distanceM: null, accuracyThresholdM: accuracyThreshold, distanceThresholdM: MAX_DISTANCE_METERS, reason: "Accuracy above threshold", timestamp: new Date().toISOString() });
          toast.error("GPS accuracy not met"); return;
        }
        const distance = getDistanceMeters(pos, { lat: shift.client.lat, lng: shift.client.lng });
        if (distance > MAX_DISTANCE_METERS) {
          const msg = `You are ${formatDistanceMiles(distance)} from ${shift.client.name}. You must be within ${formatDistanceMiles(MAX_DISTANCE_METERS)} of the client address to clock out.`;
          setGpsError(msg);
          setVerifyResult({ ok: false, accuracyM: pos.accuracy, distanceM: distance, accuracyThresholdM: accuracyThreshold, distanceThresholdM: MAX_DISTANCE_METERS, reason: "Outside geofence", timestamp: new Date().toISOString() });
          toast.error("Too far from client"); return;
        }
        clockOutPos = pos;
        setVerifyResult({ ok: true, accuracyM: pos.accuracy, distanceM: distance, accuracyThresholdM: accuracyThreshold, distanceThresholdM: MAX_DISTANCE_METERS, timestamp: new Date().toISOString() });
        toast.success(`Location verified (${formatDistanceMiles(distance)} from client)`);
      } catch (e: any) {
        const msg = e.message ?? "Failed to verify location";
        setGpsError(msg);
        setVerifyResult({ ok: false, accuracyM: null, distanceM: null, accuracyThresholdM: accuracyThreshold, distanceThresholdM: MAX_DISTANCE_METERS, reason: msg, timestamp: new Date().toISOString() });
        toast.error(msg); return;
      } finally {
        setVerifying(false);
      }
    }
    try {
      await upsert.mutateAsync({
        shift_id: id,
        meals_status: meals,
        medications_status: meds,
        medications_count: medsCount ? parseInt(medsCount, 10) : null,
        hydration,
        bowel_movement: bowel,
        mobility_assisted: mobility,
        incident_severity: incident,
        incident_note: incidentNote || null,
        notes_text: notes || null,
        voice_url: voiceUrl,
        photo_urls: photos,
        visibility,
        submitted_at: new Date().toISOString(),
      });
      // Clock out the shift
      if (shift.status === "in_progress") {
        await updateStatus.mutateAsync({
          id,
          status: "completed",
          clock_out_time: new Date().toISOString(),
          clock_out_notes: notes,
          ...(clockOutPos && {
            clock_out_lat: clockOutPos.lat,
            clock_out_lng: clockOutPos.lng,
            clock_out_accuracy: clockOutPos.accuracy,
          }),
        });
      }
      toast.success("Visit summary submitted");
      navigate(`/shifts/${id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit");
    }
  };

  if (shiftLoading || !shift) {
    return (
      <MobileLayout>
        <div className="p-5 space-y-3"><Skeleton className="h-12 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="px-5 py-5 pb-32 space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 -ml-1 inline-flex items-center justify-center rounded-full hover:bg-secondary/60">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">Care Notes</h1>
          <button onClick={() => navigate(`/shifts/${id}`)} className="text-xs text-primary inline-flex items-center gap-0.5">
            Details <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-semibold text-foreground truncate">{shift.client.name}</h2>
              <p className="text-xs text-muted-foreground truncate">{shift.client.care_type || "Personal Care"}</p>
              <p className="text-xs text-muted-foreground">{formatTime(shift.start_time)} – {formatTime(shift.end_time)}</p>
            </div>
            {shift.status === "in_progress" && (
              <div className={`text-right ${remainingMs < 0 ? "text-warning" : "text-primary"}`}>
                <Clock className="w-4 h-4 ml-auto" />
                <div className="font-mono text-sm font-bold tabular-nums">{fmtRemaining()}</div>
                <div className="text-[10px] text-muted-foreground uppercase">remaining</div>
              </div>
            )}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-muted-foreground uppercase tracking-wider">Summary progress</span>
              <span className="font-semibold text-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full gradient-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {approved && (
          <div className="rounded-2xl border border-success/40 bg-success/10 p-4 flex items-start gap-2">
            <Lock className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-success uppercase tracking-wider">Care notes locked</p>
              <p className="text-[11px] text-foreground/80 mt-1 leading-relaxed">
                Your timesheet for this shift has been approved. The care summary and version history are read-only.
                Contact your supervisor if a correction is needed.
              </p>
            </div>
          </div>
        )}

        {/* GPS verification panel — shown when clocking out */}
        {shift.status === "in_progress" && !approved && (
          <GpsVerificationPanel
            shift={shift}
            liveDistanceM={liveDistanceM}
            liveAccuracyM={liveAccuracyM}
            distanceThresholdM={MAX_DISTANCE_METERS}
            accuracyThresholdM={accuracyThreshold}
            distanceOk={liveDistanceOk}
            accuracyOk={liveAccuracyOk}
            verifying={verifying}
            result={verifyResult}
            onRefresh={() => liveLoc.refresh()}
          />
        )}

        {/* Quick Notes templates */}
        <section>
          <h3 className="text-xs font-bold tracking-[0.14em] text-primary uppercase mb-2">Quick Notes</h3>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_QUICK_NOTES.map((t) => (
              <button key={t.label} onClick={() => applyTemplate(t.content)}
                className="px-3 py-1.5 rounded-full text-xs bg-secondary/60 border border-border/60 hover:border-primary/40 transition">
                <span className="mr-1">{t.icon}</span>{t.label}
              </button>
            ))}
            {customTemplates.map((t) => (
              <button key={t.id} onClick={() => applyTemplate(t.content)}
                className="px-3 py-1.5 rounded-full text-xs bg-primary/10 border border-primary/30 text-primary">
                <span className="mr-1">{t.icon ?? "📝"}</span>{t.label}
              </button>
            ))}
            <button onClick={() => setShowAddTpl(true)}
              className="px-3 py-1.5 rounded-full text-xs border border-dashed border-primary/40 text-primary inline-flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add custom
            </button>
          </div>
        </section>

        {/* Care Summary */}
        <section className="rounded-2xl bg-card border border-border/60 p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-[0.14em] text-primary uppercase">Care Summary</h3>
          <ChipRow label="Meals" options={MEALS} value={meals} onChange={setMeals} />
          <div className="space-y-2">
            <ChipRow label="Medications" options={MEDS} value={meds} onChange={setMeds} />
            {meds === "Given" && (
              <input
                type="number" min={0} value={medsCount} onChange={(e) => setMedsCount(e.target.value)}
                placeholder="How many doses?"
                className="w-full bg-secondary/60 border border-border/60 rounded-xl px-3 py-2 text-sm"
              />
            )}
          </div>
          <ChipRow label="Hydration" options={HYDRATION} value={hydration} onChange={setHydration} />
          <ChipRow label="Bowel movement" options={BOWEL} value={bowel} onChange={setBowel} />
          <div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Mobility</div>
            <div className="flex gap-2">
              {[{ v: true, l: "Assisted" }, { v: false, l: "Independent" }].map((o) => (
                <button key={String(o.v)} onClick={() => setMobility(o.v)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                    mobility === o.v ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary/40 text-muted-foreground border-border/60"
                  }`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <ChipRow label="Incident" options={INCIDENT} value={incident} onChange={setIncident} />
          {incident && incident !== "None" && (
            <textarea value={incidentNote} onChange={(e) => setIncidentNote(e.target.value)}
              placeholder="Describe the incident…"
              className="w-full h-20 bg-secondary/60 border border-border/60 rounded-xl px-3 py-2 text-sm resize-none" />
          )}
        </section>

        {/* Notes */}
        <section className="rounded-2xl bg-card border border-border/60 p-5 space-y-3">
          <h3 className="text-xs font-bold tracking-[0.14em] text-primary uppercase">Notes</h3>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Add detailed observations, mood, communications, family notes…"
            className="w-full h-32 bg-secondary/60 border border-border/60 rounded-xl px-3 py-2 text-sm resize-none" />

          <div className="flex gap-2">
            {!recorder.isRecording ? (
              <button onClick={() => recorder.start().catch((e) => toast.error(e.message))}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-secondary/40 text-sm font-semibold">
                <Mic className="w-4 h-4 text-primary" /> Voice note
              </button>
            ) : (
              <button onClick={stopVoice}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold animate-pulse">
                <MicOff className="w-4 h-4" /> Stop ({recorder.seconds}s)
              </button>
            )}
            <button onClick={() => fileRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-secondary/40 text-sm font-semibold">
              <Camera className="w-4 h-4 text-primary" /> Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ""; }} />
          </div>

          {voiceUrl && (
            <div className="rounded-xl bg-secondary/40 border border-border/60 p-2 flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary shrink-0" />
              <audio src={voiceUrl} controls className="flex-1 h-8" />
              <button onClick={() => setVoiceUrl(null)} className="p-1 text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-secondary border border-border/60">
                  <img src={url} alt={`Care note ${i + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {uploading && (
            <div className="text-xs text-muted-foreground inline-flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</div>
          )}
        </section>

        {/* Visibility */}
        <section className="rounded-2xl bg-card border border-border/60 p-4">
          <h3 className="text-xs font-bold tracking-[0.14em] text-primary uppercase mb-3">Visibility</h3>
          <div className="grid grid-cols-2 gap-2">
            <VisBtn icon={Eye} active={visibility === "family_care_team"} label="Family & Care Team" onClick={() => setVisibility("family_care_team")} />
            <VisBtn icon={EyeOff} active={visibility === "care_team_only"} label="Care Team Only" onClick={() => setVisibility("care_team_only")} />
          </div>
        </section>

        {gpsError && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive leading-relaxed">
            {gpsError}
          </div>
        )}
        <button onClick={handleSubmit} disabled={upsert.isPending || updateStatus.isPending || verifying || progress < 100}
          className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
          {(upsert.isPending || updateStatus.isPending || verifying) ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          {verifying ? "Verifying location…" : shift.status === "in_progress" ? "Save & Clock Out" : "Save Visit Summary"}
        </button>
        {progress < 100 && (
          <p className="text-xs text-muted-foreground text-center">Complete every care summary item to enable submission.</p>
        )}
      </div>

      {showAddTpl && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-3 animate-slide-up">
            <div className="w-10 h-1 bg-muted rounded-full mx-auto" />
            <h3 className="font-display text-lg font-semibold">New quick note template</h3>
            <input value={newTplLabel} onChange={(e) => setNewTplLabel(e.target.value)}
              placeholder="Label (e.g. Took medications)"
              className="w-full bg-secondary/60 border border-border/60 rounded-xl px-3 py-2 text-sm" />
            <textarea value={newTplContent} onChange={(e) => setNewTplContent(e.target.value)}
              placeholder="Note content…"
              className="w-full h-24 bg-secondary/60 border border-border/60 rounded-xl px-3 py-2 text-sm resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddTpl(false)} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold">Cancel</button>
              <button
                onClick={async () => {
                  if (!newTplLabel.trim() || !newTplContent.trim()) return;
                  try {
                    await addTemplate.mutateAsync({ label: newTplLabel.trim(), content: newTplContent.trim() });
                    setNewTplLabel(""); setNewTplContent(""); setShowAddTpl(false);
                    toast.success("Template saved");
                  } catch (e: any) { toast.error(e.message ?? "Failed"); }
                }}
                disabled={addTemplate.isPending}
                className="flex-1 py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
              >Save</button>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
};

function ChipRow({ label, options, value, onChange }: { label: string; options: string[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              value === o ? "bg-primary/15 text-primary border-primary/40" : "bg-secondary/40 text-muted-foreground border-border/60"
            }`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function VisBtn({ icon: Icon, active, label, onClick }: { icon: any; active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-left ${
        active ? "bg-primary/10 border-primary/40 text-foreground" : "bg-secondary/40 border-border/60 text-muted-foreground"
      }`}>
      <Icon className={`w-4 h-4 ${active ? "text-primary" : ""}`} />
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

export default CareNotesPage;