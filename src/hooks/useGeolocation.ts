export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy?: number; // meters
}

/** Returns the device's current GPS position */
export function getCurrentPosition(): Promise<GeoPosition & { accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new Error("Location permission denied. Please enable location access in your device settings."));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new Error("Unable to determine your location. Please try again."));
            break;
          case err.TIMEOUT:
            reject(new Error("Location request timed out. Please try again."));
            break;
          default:
            reject(new Error("Failed to get your location."));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

/** Haversine distance in meters between two lat/lng points */
export function getDistanceMeters(a: GeoPosition, b: GeoPosition): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Max allowed distance: 200 meters geofence radius from client address */
export const MAX_DISTANCE_METERS = 200;

/** Convert meters to feet */
export function metersToFeet(m: number): number {
  return m * 3.28084;
}

/** Convert meters to miles */
export function metersToMiles(m: number): number {
  return m / 1609.344;
}

/**
 * Human-friendly distance string in miles. Uses feet for short distances
 * (< 0.1 mi) so the user gets a sensible read-out at clock-in range.
 */
export function formatDistanceMiles(meters: number): string {
  const miles = metersToMiles(meters);
  if (miles < 0.1) {
    return `${Math.round(metersToFeet(meters))} ft`;
  }
  if (miles < 10) return `${miles.toFixed(2)} mi`;
  return `${miles.toFixed(1)} mi`;
}
