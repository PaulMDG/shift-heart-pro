export interface GeoPosition {
  lat: number;
  lng: number;
}

/** Returns the device's current GPS position */
export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
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

/** Max allowed distance: 100 ft geofence + 150 ft buffer = 250 ft ≈ 76.2 m */
export const MAX_DISTANCE_METERS = 76.2;

/** Convert meters to feet */
export function metersToFeet(m: number): number {
  return m * 3.28084;
}
