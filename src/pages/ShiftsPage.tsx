import MobileLayout from "@/components/layout/MobileLayout";
import ShiftCard from "@/components/shifts/ShiftCard";
import SwapRequestCard from "@/components/shifts/SwapRequestCard";
import { useShifts, type ShiftWithClient } from "@/hooks/useShifts";
import {
  useMySwapRequests,
  useIncomingSwapRequests,
  useAcceptSwapRequest,
  useDeclineSwapRequest,
  useCancelSwapRequest,
} from "@/hooks/useSwapRequests";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { supabase } from "@/integrations/supabase/client";
import { openDirections } from "@/lib/directions";
import { formatTime } from "@/lib/format";
import { useNavigate } from "react-router-dom";
import { Navigation, MapPin, Clock, CheckCircle2, Route, Wand2, Loader2, ChevronRight, Calendar as CalendarIcon, ListChecks, AlertTriangle, Timer } from "lucide-react";

const tabs = ["My Day", "Calendar", "Swaps"] as const;

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fmtMin(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function fmtMiles(m: number) {
  const mi = m / 1609.344;
  return `${mi.toFixed(mi >= 10 ? 0 : 1)} mi`;
}

const ShiftsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("My Day");
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [optimizedOrder, setOptimizedOrder] = useState<string[] | null>(null);
  const [routeStats, setRouteStats] = useState<{
    durationSec: number;
    distanceMeters: number;
    legs: { durationSec: number; distanceMeters: number }[];
    fallback?: boolean;
    fallbackReason?: string;
    computedAt?: number;
  } | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  const { data: shifts = [], isLoading } = useShifts();
  const { data: mySwaps = [], isLoading: swapsLoading } = useMySwapRequests();
  const { data: incomingSwaps = [] } = useIncomingSwapRequests();
  const acceptSwap = useAcceptSwapRequest();
  const declineSwap = useDeclineSwapRequest();
  const cancelSwap = useCancelSwapRequest();
  const live = useLiveLocation();

  const today = new Date().toISOString().split("T")[0];
  const dayShifts = useMemo(() => {
    const date = activeTab === "Calendar" ? selectedDate : today;
    return shifts
      .filter((s) => s.date === date)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [shifts, activeTab, selectedDate, today]);

  const orderedDayShifts = useMemo(() => {
    if (!optimizedOrder) return dayShifts;
    const map = new Map(dayShifts.map((s) => [s.id, s]));
    return optimizedOrder.map((id) => map.get(id)).filter(Boolean) as ShiftWithClient[];
  }, [dayShifts, optimizedOrder]);

  const nextShift = orderedDayShifts.find((s) => s.status !== "completed" && s.status !== "missed");

  const totalShiftMin = useMemo(() => {
    return dayShifts.reduce((acc, s) => {
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);
      return acc + Math.max(0, eh * 60 + em - (sh * 60 + sm));
    }, 0);
  }, [dayShifts]);
  const completedCount = dayShifts.filter((s) => s.status === "completed").length;
  const totalTravelMin = routeStats ? Math.round(routeStats.durationSec / 60) : null;
  const onTimeCount = dayShifts.filter((s) => {
    if (!s.clock_in_time) return false;
    const [sh, sm] = s.start_time.split(":").map(Number);
    const scheduled = new Date(`${s.date}T${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00`);
    return new Date(s.clock_in_time).getTime() - scheduled.getTime() <= 15 * 60 * 1000;
  }).length;

  const stopsForRoute = orderedDayShifts.filter((s) => s.client?.lat != null && s.client?.lng != null && s.status !== "completed");

  const distanceToNext = nextShift && live.position && nextShift.client.lat != null && nextShift.client.lng != null
    ? haversine(live.position, { lat: nextShift.client.lat, lng: nextShift.client.lng })
    : null;

  const optimize = async () => {
    if (!live.position) {
      toast.error("Waiting for GPS — enable location to optimize route.");
      return;
    }
    if (stopsForRoute.length < 2) {
      toast.info("Need at least 2 upcoming stops with coordinates to optimize.");
      return;
    }
    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-route", {
        body: {
          origin: { lat: live.position.lat, lng: live.position.lng },
          stops: stopsForRoute.map((s) => ({ id: s.id, lat: s.client.lat!, lng: s.client.lng! })),
        },
      });
      if (error) throw error;
      const completedIds = orderedDayShifts.filter((s) => s.status === "completed").map((s) => s.id);
      setOptimizedOrder([...completedIds, ...(data.orderedIds as string[])]);
      setRouteStats({
        durationSec: data.durationSec,
        distanceMeters: data.distanceMeters,
        legs: data.legs ?? [],
        fallback: !!data.fallback,
        fallbackReason: data.fallbackReason,
        computedAt: Date.now(),
      });
      if (data.fallback) {
        toast.warning?.("Using approximate route — Google Maps unavailable") ?? toast.error("Using approximate route — Google Maps unavailable");
      } else {
        toast.success("Route optimized");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to optimize route");
    } finally {
      setOptimizing(false);
    }
  };

  const handleAccept = async (id: string) => {
    try { await acceptSwap.mutateAsync(id); toast.success("Swap accepted."); }
    catch (e: any) { toast.error(e.message || "Failed to accept swap"); }
  };
  const handleDecline = async (id: string) => {
    try { await declineSwap.mutateAsync(id); toast.success("Swap declined."); }
    catch (e: any) { toast.error(e.message || "Failed to decline swap"); }
  };
  const handleCancel = async (id: string) => {
    try { await cancelSwap.mutateAsync(id); toast.success("Swap cancelled."); }
    catch (e: any) { toast.error(e.message || "Failed to cancel swap"); }
  };

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Schedule</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeTab === "Calendar" ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "Today's route & visits"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-full text-xs font-semibold relative transition ${
                activeTab === t ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t}
              {t === "Swaps" && incomingSwaps.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {incomingSwaps.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab !== "Swaps" && (
          <>
            {activeTab === "Calendar" && (
              <div className="rounded-2xl border border-border/60 bg-card p-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setOptimizedOrder(null); setRouteStats(null); }}
                  className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                />
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Shift" value={fmtMin(totalShiftMin * 60)} icon={Clock} />
              <Stat label="Done" value={`${completedCount}/${dayShifts.length}`} icon={CheckCircle2} />
              <Stat label="Travel" value={totalTravelMin != null ? `${totalTravelMin}m` : "—"} icon={Route} />
              <Stat label="On time" value={`${onTimeCount}/${dayShifts.length}`} icon={ListChecks} />
            </div>

            {/* Map preview */}
            {stopsForRoute.length > 0 && (
              <RouteMap origin={live.position} stops={stopsForRoute} />
            )}

            {/* Next visit highlight */}
            {nextShift && (
              <div className="rounded-2xl bg-primary/10 border border-primary/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-primary">Next visit</span>
                  {distanceToNext != null && (
                    <span className="text-[11px] text-primary/80">{fmtMiles(distanceToNext)} away</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg font-semibold text-foreground truncate">{nextShift.client.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{nextShift.client.address}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatTime(nextShift.start_time)} – {formatTime(nextShift.end_time)}</p>
                  </div>
                  <button
                    onClick={() => openDirections({ lat: nextShift.client.lat, lng: nextShift.client.lng, address: nextShift.client.address, label: nextShift.client.name })}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-bold"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Start
                  </button>
                </div>
              </div>
            )}

            {/* Optimize */}
            {stopsForRoute.length >= 2 && (
              <button
                onClick={optimize}
                disabled={optimizing}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl border border-primary/30 bg-primary/5 text-primary text-sm font-semibold disabled:opacity-60"
              >
                {optimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {optimizing ? "Optimizing route…" : optimizedOrder ? "Re-optimize route" : "Optimize today's route"}
              </button>
            )}

            {/* Route summary / fallback banner */}
            {routeStats && (
              <RouteSummary stats={routeStats} />
            )}

            {/* Timeline */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold tracking-[0.14em] text-primary uppercase">Today's Route</h3>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
              ) : orderedDayShifts.length > 0 ? (
                <ol className="relative space-y-3 before:absolute before:left-[18px] before:top-3 before:bottom-3 before:w-px before:bg-border">
                  {orderedDayShifts.map((s, i) => {
                    const isNext = nextShift?.id === s.id;
                    return (
                      <li key={s.id} className="relative pl-12">
                        <span className={`absolute left-0 top-2 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                          s.status === "completed" ? "bg-success/20 text-success border-success/40"
                          : isNext ? "gradient-primary text-primary-foreground border-transparent"
                          : "bg-card text-muted-foreground border-border"
                        }`}>
                          {s.status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                        </span>
                        <ShiftCard shift={s} />
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="rounded-2xl bg-card border border-border p-8 text-center">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No shifts scheduled</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "Swaps" && (
          <div className="space-y-5">
            {incomingSwaps.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Incoming Requests</h3>
                <div className="space-y-3">
                  {incomingSwaps.map((req) => (
                    <SwapRequestCard key={req.id} request={req} variant="incoming" onAccept={handleAccept} onDecline={handleDecline} isLoading={acceptSwap.isPending || declineSwap.isPending} />
                  ))}
                </div>
              </section>
            )}
            <section>
              <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">My Requests</h3>
              <div className="space-y-3">
                {swapsLoading ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
                  : mySwaps.length > 0 ? mySwaps.map((req) => (
                      <SwapRequestCard key={req.id} request={req} variant="outgoing" onCancel={handleCancel} isLoading={cancelSwap.isPending} />
                    ))
                  : <div className="bg-card rounded-2xl p-8 border border-border text-center"><p className="text-sm text-muted-foreground">No swap requests yet</p></div>}
              </div>
            </section>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-xl bg-card border border-border/60 p-2.5 text-center">
      <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
      <div className="text-sm font-bold text-foreground leading-none">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function RouteSummary({ stats }: { stats: { durationSec: number; distanceMeters: number; fallback?: boolean; fallbackReason?: string; computedAt?: number } }) {
  const computedAt = stats.computedAt ?? Date.now();
  const eta = new Date(computedAt + stats.durationSec * 1000);
  const etaText = eta.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (stats.fallback) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-warning uppercase tracking-wider">Approximate route</p>
            <p className="text-[11px] text-foreground/80 leading-relaxed mt-0.5">
              Live Google Maps routing is temporarily unavailable
              {stats.fallbackReason ? ` (${stats.fallbackReason})` : ""}.
              We estimated the order, distance and ETA using straight-line driving math.
              Navigation still works — tap <strong>Start</strong> to open turn-by-turn directions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1 border-t border-warning/30">
          <span className="inline-flex items-center gap-1.5 text-xs text-foreground"><Timer className="w-3.5 h-3.5 text-warning" /> ETA <strong className="font-bold">{etaText}</strong></span>
          <span className="inline-flex items-center gap-1.5 text-xs text-foreground"><Route className="w-3.5 h-3.5 text-warning" /> {fmtMin(stats.durationSec)} · {fmtMiles(stats.distanceMeters)}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
      <span className="inline-flex items-center gap-1.5 text-xs text-foreground"><Timer className="w-3.5 h-3.5 text-primary" /> ETA <strong className="font-bold">{etaText}</strong></span>
      <span className="inline-flex items-center gap-1.5 text-xs text-foreground"><Route className="w-3.5 h-3.5 text-primary" /> {fmtMin(stats.durationSec)} · {fmtMiles(stats.distanceMeters)}</span>
      <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider">Live</span>
    </div>
  );
}

function RouteMap({ origin, stops }: { origin: { lat: number; lng: number } | null; stops: ShiftWithClient[] }) {
  const points = [
    ...(origin ? [{ lat: origin.lat, lng: origin.lng, label: "•" }] : []),
    ...stops.map((s, i) => ({ lat: s.client.lat!, lng: s.client.lng!, label: String(i + 1) })),
  ];
  if (points.length === 0) return null;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const padLat = (maxLat - minLat) * 0.2 || 0.005;
  const padLng = (maxLng - minLng) * 0.2 || 0.005;
  const W = 380, H = 160;
  const toXY = (p: { lat: number; lng: number }) => {
    const x = ((p.lng - (minLng - padLng)) / ((maxLng + padLng) - (minLng - padLng))) * W;
    const y = H - ((p.lat - (minLat - padLat)) / ((maxLat + padLat) - (minLat - padLat))) * H;
    return { x, y };
  };
  const path = points.map(toXY).map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-secondary/40 overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" />
        {points.map((p, i) => {
          const { x, y } = toXY(p);
          const isOrigin = i === 0 && origin;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={isOrigin ? 6 : 10} fill={isOrigin ? "hsl(var(--success))" : "hsl(var(--primary))"} stroke="hsl(var(--background))" strokeWidth="2" />
              {!isOrigin && (
                <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="hsl(var(--primary-foreground))">{p.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="px-3 py-2 flex items-center gap-3 text-[11px] text-muted-foreground border-t border-border/60 bg-card/40">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> You</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Stops</span>
        <span className="ml-auto inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {stops.length}</span>
      </div>
    </div>
  );
}

export default ShiftsPage;
