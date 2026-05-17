export interface StructuredAddress {
  street?: string;
  city?: string;
  state?: string;
  postalcode?: string;
  country?: string;
}

const BASE = "https://nominatim.openstreetmap.org/search";
const COMMON = "format=json&limit=1&addressdetails=0&countrycodes=us";

async function nominatim(params: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`${BASE}?${COMMON}&${params}`, {
      headers: { "Accept-Language": "en", "User-Agent": "CareLink-Pro/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // network error — fall through
  }
  return null;
}

/**
 * Geocode an address. Accepts either a free-form string or a structured
 * object. Tries structured lookup first (most reliable for rural US
 * addresses), then falls back to progressively looser free-text queries
 * before giving up.
 */
export async function geocodeAddress(
  input: string | StructuredAddress,
): Promise<{ lat: number; lng: number } | null> {
  const s: StructuredAddress =
    typeof input === "string" ? parseFreeForm(input) : input;

  const qs = (o: Record<string, string | undefined>) =>
    Object.entries(o)
      .filter(([, v]) => v && v.trim())
      .map(([k, v]) => `${k}=${encodeURIComponent(v!.trim())}`)
      .join("&");

  // 1. Full structured query
  if (s.street || s.postalcode) {
    const hit = await nominatim(qs({
      street: s.street,
      city: s.city,
      state: s.state,
      postalcode: s.postalcode,
      country: s.country || "USA",
    }));
    if (hit) return hit;
  }

  // 2. Drop the street – useful when the street name is mis-typed
  //    but city + ZIP are valid (returns the postal centroid).
  if (s.postalcode || s.city) {
    const hit = await nominatim(qs({
      city: s.city,
      state: s.state,
      postalcode: s.postalcode,
      country: s.country || "USA",
    }));
    if (hit) return hit;
  }

  // 3. Free-text fallback (whatever we can stitch together)
  const free = [s.street, s.city, [s.state, s.postalcode].filter(Boolean).join(" ")]
    .map((x) => x?.trim())
    .filter(Boolean)
    .join(", ");
  if (free) {
    const hit = await nominatim(`q=${encodeURIComponent(free)}`);
    if (hit) return hit;
  }

  return null;
}

function parseFreeForm(addr: string): StructuredAddress {
  // Best-effort split: "street, city, STATE ZIP"
  const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return {};
  const result: StructuredAddress = { street: parts[0] };
  if (parts.length >= 2) result.city = parts[1];
  const tail = parts[parts.length - 1];
  const m = tail.match(/([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?/);
  if (m) {
    result.state = m[1];
    if (m[2]) result.postalcode = m[2];
  }
  return result;
}