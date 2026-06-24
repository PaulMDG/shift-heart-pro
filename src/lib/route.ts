/** Shared route math helpers used by the dashboard and full schedule view. */

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Approximate driving time at ~25 mph (urban + buffers). */
export function estimateTravelSeconds(distanceMeters: number): number {
  const mph = 25;
  const metersPerSec = (mph * 1609.344) / 3600;
  return distanceMeters / metersPerSec;
}

export function formatMiles(meters: number): string {
  const mi = meters / 1609.344;
  if (mi < 0.1) return "< 0.1 mi";
  return `${mi.toFixed(mi >= 10 ? 0 : 1)} mi`;
}

export function formatDuration(seconds: number): string {
  const m = Math.max(1, Math.round(seconds / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export interface RouteStop {
  lat: number;
  lng: number;
}

/**
 * Sum straight-line distance across an ordered list of stops, optionally
 * starting from the caregiver's current position.
 */
export function summarizeRoute(
  stops: RouteStop[],
  origin?: RouteStop | null,
): { distanceMeters: number; travelSeconds: number } {
  const ordered = origin ? [origin, ...stops] : stops;
  let distanceMeters = 0;
  for (let i = 1; i < ordered.length; i++) {
    distanceMeters += haversineMeters(ordered[i - 1], ordered[i]);
  }
  return {
    distanceMeters,
    travelSeconds: estimateTravelSeconds(distanceMeters),
  };
}