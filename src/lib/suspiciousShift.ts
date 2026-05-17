import { getDistanceMeters, MAX_DISTANCE_METERS, formatDistanceMiles, metersToFeet } from "@/hooks/useGeolocation";

/** Default thresholds. Admin can override per-agency via agency_settings. */
export const ACCURACY_THRESHOLD_METERS = 100;
export const REPEAT_FAILURE_THRESHOLD = 2;

export interface SuspicionThresholds {
  geofence_radius_m: number;
  accuracy_threshold_m: number;
  repeat_failure_threshold: number;
}

export const DEFAULT_THRESHOLDS: SuspicionThresholds = {
  geofence_radius_m: MAX_DISTANCE_METERS,
  accuracy_threshold_m: ACCURACY_THRESHOLD_METERS,
  repeat_failure_threshold: REPEAT_FAILURE_THRESHOLD,
};

export interface SuspicionResult {
  suspicious: boolean;
  severity: "none" | "warn" | "high";
  reasons: string[];
}

interface ShiftLike {
  caregiver_id?: string | null;
  clock_in_lat?: number | null;
  clock_in_lng?: number | null;
  clock_out_lat?: number | null;
  clock_out_lng?: number | null;
  clock_in_accuracy?: number | null;
  clock_out_accuracy?: number | null;
  client?: { lat?: number | null; lng?: number | null } | null;
}

function farFromClient(
  point: { lat?: number | null; lng?: number | null } | null | undefined,
  client: { lat?: number | null; lng?: number | null } | null | undefined,
): number | null {
  if (!point || point.lat == null || point.lng == null) return null;
  if (!client || client.lat == null || client.lng == null) return null;
  return getDistanceMeters(
    { lat: point.lat, lng: point.lng },
    { lat: client.lat, lng: client.lng },
  );
}

/**
 * Build a map of caregiver_id -> count of shifts with at least one
 * out-of-radius clock-in or clock-out event.
 */
export function buildCaregiverFailureCounts(
  shifts: ShiftLike[],
  thresholds: SuspicionThresholds = DEFAULT_THRESHOLDS,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of shifts) {
    if (!s.caregiver_id) continue;
    const inDist = farFromClient(
      { lat: s.clock_in_lat, lng: s.clock_in_lng },
      s.client ?? null,
    );
    const outDist = farFromClient(
      { lat: s.clock_out_lat, lng: s.clock_out_lng },
      s.client ?? null,
    );
    const failed =
      (inDist != null && inDist > thresholds.geofence_radius_m) ||
      (outDist != null && outDist > thresholds.geofence_radius_m);
    if (failed) counts.set(s.caregiver_id, (counts.get(s.caregiver_id) ?? 0) + 1);
  }
  return counts;
}

export function evaluateShiftSuspicion(
  shift: ShiftLike,
  caregiverFailureCount = 0,
  thresholds: SuspicionThresholds = DEFAULT_THRESHOLDS,
): SuspicionResult {
  const reasons: string[] = [];
  let severity: SuspicionResult["severity"] = "none";

  const inDist = farFromClient(
    { lat: shift.clock_in_lat, lng: shift.clock_in_lng },
    shift.client ?? null,
  );
  const outDist = farFromClient(
    { lat: shift.clock_out_lat, lng: shift.clock_out_lng },
    shift.client ?? null,
  );

  if (inDist != null && inDist > thresholds.geofence_radius_m) {
    reasons.push(`Clock-in ${formatDistanceMiles(inDist)} from client (max ${formatDistanceMiles(thresholds.geofence_radius_m)})`);
    severity = "high";
  }
  if (outDist != null && outDist > thresholds.geofence_radius_m) {
    reasons.push(`Clock-out ${formatDistanceMiles(outDist)} from client (max ${formatDistanceMiles(thresholds.geofence_radius_m)})`);
    severity = "high";
  }

  if (shift.clock_in_accuracy != null && shift.clock_in_accuracy > thresholds.accuracy_threshold_m) {
    reasons.push(`Low GPS accuracy at clock-in (±${Math.round(metersToFeet(shift.clock_in_accuracy))} ft)`);
    if (severity === "none") severity = "warn";
  }
  if (shift.clock_out_accuracy != null && shift.clock_out_accuracy > thresholds.accuracy_threshold_m) {
    reasons.push(`Low GPS accuracy at clock-out (±${Math.round(metersToFeet(shift.clock_out_accuracy))} ft)`);
    if (severity === "none") severity = "warn";
  }

  if (caregiverFailureCount >= thresholds.repeat_failure_threshold) {
    reasons.push(`Caregiver has ${caregiverFailureCount} geofence failures recently`);
    severity = "high";
  }

  return { suspicious: reasons.length > 0, severity, reasons };
}
