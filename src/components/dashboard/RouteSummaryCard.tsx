import { ChevronRight, MapPin, Route, Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import type { ShiftWithClient } from "@/hooks/useShifts";
import { formatDuration, formatMiles, summarizeRoute } from "@/lib/route";

interface Props {
  shifts: ShiftWithClient[];
}

/**
 * Compact route summary that replaces the dashboard's empty "schedule graph"
 * placeholder. Shows stop count, estimated total distance and travel time,
 * and a mini static SVG plot of today's stops (no external map SDK).
 */
const RouteSummaryCard = ({ shifts }: Props) => {
  const navigate = useNavigate();
  const live = useLiveLocation();

  const stops = shifts.filter(
    (s) =>
      s.client?.lat != null &&
      s.client?.lng != null &&
      s.status !== "completed" &&
      s.status !== "missed",
  );

  if (stops.length === 0) return null;

  const origin =
    live.position && live.permission === "granted"
      ? { lat: live.position.lat, lng: live.position.lng }
      : null;

  const stopPoints = stops.map((s) => ({
    lat: s.client!.lat as number,
    lng: s.client!.lng as number,
  }));
  const { distanceMeters, travelSeconds } = summarizeRoute(stopPoints, origin);

  return (
    <section className="bg-surface text-surface-foreground rounded-3xl p-5 border border-[hsl(var(--ivory-border))] shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] tracking-[0.22em] text-primary-strong font-semibold uppercase">
          Today's route
        </p>
        <button
          type="button"
          onClick={() => navigate("/shifts")}
          className="focus-ring text-primary-strong text-sm font-semibold inline-flex items-center gap-0.5 min-h-11 px-1"
          aria-label="Open full schedule"
        >
          Full route
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <MiniRouteMap origin={origin} stops={stopPoints} />

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <SummaryStat icon={MapPin} label="Stops" value={String(stops.length)} />
        <SummaryStat
          icon={Route}
          label="Distance"
          value={formatMiles(distanceMeters)}
        />
        <SummaryStat
          icon={Timer}
          label="Travel"
          value={formatDuration(travelSeconds)}
        />
      </dl>
      <p className="mt-2 text-[10px] text-muted-foreground text-center">
        Estimated — confirm precise ETA in the full schedule.
      </p>
    </section>
  );
};

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-canvas border border-[hsl(var(--ivory-border))] py-2.5 px-2">
      <Icon
        aria-hidden
        className="w-4 h-4 text-primary-strong mx-auto mb-1"
      />
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-bold text-surface-foreground leading-tight">
        {value}
      </dd>
    </div>
  );
}

function MiniRouteMap({
  origin,
  stops,
}: {
  origin: { lat: number; lng: number } | null;
  stops: { lat: number; lng: number }[];
}) {
  const points = [...(origin ? [origin] : []), ...stops];
  if (points.length === 0) return null;

  const W = 320;
  const H = 120;

  let inner: React.ReactNode;
  if (points.length === 1) {
    inner = (
      <circle
        cx={W / 2}
        cy={H / 2}
        r={8}
        fill="hsl(32 55% 58%)"
        stroke="hsl(0 0% 100%)"
        strokeWidth={2}
      />
    );
  } else {
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padLat = (maxLat - minLat) * 0.25 || 0.005;
    const padLng = (maxLng - minLng) * 0.25 || 0.005;
    const toXY = (p: { lat: number; lng: number }) => {
      const x =
        ((p.lng - (minLng - padLng)) /
          (maxLng + padLng - (minLng - padLng))) * W;
      const y =
        H -
        ((p.lat - (minLat - padLat)) /
          (maxLat + padLat - (minLat - padLat))) * H;
      return { x, y };
    };
    const coords = points.map(toXY);
    const path = coords
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
    inner = (
      <>
        <path
          d={path}
          fill="none"
          stroke="hsl(28 62% 42%)"
          strokeWidth={2}
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
        {coords.map((p, i) => {
          const isOrigin = origin && i === 0;
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isOrigin ? 5 : 9}
                fill={isOrigin ? "hsl(152 50% 42%)" : "hsl(32 55% 58%)"}
                stroke="hsl(0 0% 100%)"
                strokeWidth={2}
              />
              {!isOrigin && (
                <text
                  x={p.x}
                  y={p.y + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight={700}
                  fill="hsl(217 60% 12%)"
                >
                  {origin ? i : i + 1}
                </text>
              )}
            </g>
          );
        })}
      </>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Mini route map with ${stops.length} stop${stops.length === 1 ? "" : "s"}`}
      className="rounded-2xl border border-[hsl(var(--ivory-border))] bg-gradient-to-br from-[hsl(38_35%_95%)] to-[hsl(32_25%_90%)] overflow-hidden"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28">
        <defs>
          <pattern
            id="route-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="hsl(32 25% 80%)"
              strokeWidth="0.5"
              opacity={0.6}
            />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#route-grid)" />
        {inner}
      </svg>
    </div>
  );
}

export default RouteSummaryCard;