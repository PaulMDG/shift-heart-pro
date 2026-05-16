import { getDistanceMeters, MAX_DISTANCE_METERS } from "@/hooks/useGeolocation";

/** Accuracy worse than this (meters) is treated as unreliable GPS. */
export const ACCURACY_THRESHOLD_METERS = 100;

/** Threshold for repeated geofence failures per caregiver. */
export const REPEAT_FAILURE_THRESHOLD = 2;

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
export function buildCaregiverFailureCounts(shifts: ShiftLike[]): Map<string, number> {
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
      (inDist != null && inDist > MAX_DISTANCE_METERS) ||
      (outDist != null && outDist > MAX_DISTANCE_METERS);
    if (failed) counts.set(s.caregiver_id, (counts.get(s.caregiver_id) ?? 0) + 1);
  }
  return counts;
}

export function evaluateShiftSuspicion(
  shift: ShiftLike,
  caregiverFailureCount = 0,
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

  if (inDist != null && inDist > MAX_DISTANCE_METERS) {
    reasons.push(`Clock-in ${Math.round(inDist)} m from client (max ${MAX_DISTANCE_METERS} m)`);
    severity = "high";
  }
  if (outDist != null && outDist > MAX_DISTANCE_METERS) {
    reasons.push(`Clock-out ${Math.round(outDist)} m from client (max ${MAX_DISTANCE_METERS} m)`);
    severity = "high";
  }

  if (shift.clock_in_accuracy != null && shift.clock_in_accuracy > ACCURACY_THRESHOLD_METERS) {
    reasons.push(`Low GPS accuracy at clock-in (±${Math.round(shift.clock_in_accuracy)} m)`);
    if (severity === "none") severity = "warn";
  }
  if (shift.clock_out_accuracy != null && shift.clock_out_accuracy > ACCURACY_THRESHOLD_METERS) {
    reasons.push(`Low GPS accuracy at clock-out (±${Math.round(shift.clock_out_accuracy)} m)`);
    if (severity === "none") severity = "warn";
  }

  if (caregiverFailureCount >= REPEAT_FAILURE_THRESHOLD) {
    reasons.push(`Caregiver has ${caregiverFailureCount} geofence failures recently`);
    severity = "high";
  }

  return { suspicious: reasons.length > 0, severity, reasons };
}
