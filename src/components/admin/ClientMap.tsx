import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getDistanceMeters, MAX_DISTANCE_METERS } from "@/hooks/useGeolocation";

// Fix default marker icons under Vite bundler
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface ClientMapProps {
  clients: Array<{ id: string; name: string; address?: string; lat: number | null; lng: number | null }>;
  shifts: Array<{
    id: string;
    client_id: string;
    date: string;
    clock_in_lat: number | null;
    clock_in_lng: number | null;
    clock_out_lat: number | null;
    clock_out_lng: number | null;
  }>;
  radiusMeters?: number;
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds.pad(0.2), { maxZoom: 14 });
  }, [points, map]);
  return null;
}

export default function ClientMap({ clients, shifts, radiusMeters = MAX_DISTANCE_METERS }: ClientMapProps) {
  const geocoded = useMemo(
    () => clients.filter((c) => c.lat != null && c.lng != null),
    [clients],
  );
  const clientById = useMemo(() => new Map(geocoded.map((c) => [c.id, c])), [geocoded]);

  // Out-of-geofence shift clock-in/out points keyed by shift
  const outsidePoints = useMemo(() => {
    const pts: Array<{
      shiftId: string;
      clientName: string;
      lat: number;
      lng: number;
      kind: "in" | "out";
      distance: number;
      date: string;
    }> = [];
    for (const s of shifts) {
      const c = clientById.get(s.client_id);
      if (!c || c.lat == null || c.lng == null) continue;
      const check = (lat: number | null, lng: number | null, kind: "in" | "out") => {
        if (lat == null || lng == null) return;
        const d = getDistanceMeters({ lat, lng }, { lat: c.lat!, lng: c.lng! });
        if (d > radiusMeters) pts.push({ shiftId: s.id, clientName: c.name, lat, lng, kind, distance: d, date: s.date });
      };
      check(s.clock_in_lat, s.clock_in_lng, "in");
      check(s.clock_out_lat, s.clock_out_lng, "out");
    }
    return pts;
  }, [shifts, clientById, radiusMeters]);

  const bounds = useMemo<Array<[number, number]>>(() => {
    const pts: Array<[number, number]> = [];
    geocoded.forEach((c) => pts.push([c.lat!, c.lng!]));
    outsidePoints.forEach((p) => pts.push([p.lat, p.lng]));
    return pts;
  }, [geocoded, outsidePoints]);

  if (geocoded.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 border border-border text-center text-sm text-muted-foreground">
        No clients with GPS coordinates yet. Geocode clients first to populate the map.
      </div>
    );
  }

  const center: [number, number] = [geocoded[0].lat!, geocoded[0].lng!];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border border-border" style={{ height: 420 }}>
        <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={bounds} />

          {geocoded.map((c) => (
            <Marker key={c.id} position={[c.lat!, c.lng!]}>
              <Popup>
                <div className="text-xs">
                  <strong>{c.name}</strong>
                  {c.address && <div className="text-muted-foreground">{c.address}</div>}
                  <div className="mt-1">{c.lat!.toFixed(5)}, {c.lng!.toFixed(5)}</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {outsidePoints.map((p) => (
            <CircleMarker
              key={`${p.shiftId}-${p.kind}`}
              center={[p.lat, p.lng]}
              radius={9}
              pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.7, weight: 2 }}
            >
              <Popup>
                <div className="text-xs">
                  <strong>Out-of-geofence clock-{p.kind}</strong>
                  <div>{p.clientName}</div>
                  <div>{p.date}</div>
                  <div className="text-red-600">
                    {(p.distance / 1609.344).toFixed(2)} mi from client
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-primary" /> Client address ({geocoded.length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-destructive" /> Out-of-geofence clock-in/out ({outsidePoints.length})
        </span>
      </div>
    </div>
  );
}