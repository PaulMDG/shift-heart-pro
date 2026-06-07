/**
 * Open turn-by-turn directions to a destination.
 * - On iOS / macOS: uses Apple Maps (maps://) which opens the native app when installed.
 * - Otherwise: opens Google Maps in a new tab.
 * Prefers coordinates when available; falls back to the street address.
 */
export function openDirections(opts: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  label?: string | null;
}) {
  const { lat, lng, address, label } = opts;
  const hasCoords = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
  const dest = hasCoords ? `${lat},${lng}` : (address ?? "").trim();
  if (!dest) return false;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isApple = /iPhone|iPad|iPod|Macintosh/i.test(ua);

  let url: string;
  if (isApple) {
    const q = hasCoords
      ? `daddr=${dest}`
      : `daddr=${encodeURIComponent(dest)}`;
    const name = label ? `&q=${encodeURIComponent(label)}` : "";
    url = `https://maps.apple.com/?${q}${name}&dirflg=d`;
  } else {
    url = hasCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
  }
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}