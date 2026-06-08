import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

interface Stop {
  id: string
  lat: number
  lng: number
}

interface Body {
  origin: { lat: number; lng: number }
  stops: Stop[]
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const lovableKey = Deno.env.get('LOVABLE_API_KEY')
    const gmapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!lovableKey || !gmapsKey) {
      return new Response(JSON.stringify({ error: 'Missing connector credentials' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json()) as Body
    if (!body?.origin || !Array.isArray(body.stops) || body.stops.length < 2) {
      return new Response(JSON.stringify({ error: 'origin and 2+ stops required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const last = body.stops[body.stops.length - 1]
    const intermediates = body.stops.slice(0, -1).map((s) => ({
      location: { latLng: { latitude: s.lat, longitude: s.lng } },
    }))

    const reqBody = {
      origin: { location: { latLng: { latitude: body.origin.lat, longitude: body.origin.lng } } },
      destination: { location: { latLng: { latitude: last.lat, longitude: last.lng } } },
      intermediates,
      travelMode: 'DRIVE',
      optimizeWaypointOrder: true,
      routingPreference: 'TRAFFIC_AWARE',
    }

    const resp = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': gmapsKey,
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'routes.optimizedIntermediateWaypointIndex,routes.duration,routes.distanceMeters,routes.legs.duration,routes.legs.distanceMeters',
      },
      body: JSON.stringify(reqBody),
    })

    const text = await resp.text()
    if (!resp.ok) {
      // Fallback: nearest-neighbor with haversine + driving estimate so the app keeps working.
      return new Response(JSON.stringify({
        ...buildFallback(body.origin, body.stops),
        fallback: true,
        fallbackReason: `Routes API ${resp.status}`,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const data = JSON.parse(text)
    const route = data?.routes?.[0]
    const order = route?.optimizedIntermediateWaypointIndex as number[] | undefined

    // Reconstruct optimized id order: intermediates in returned order, then final destination.
    const intermediateIds = body.stops.slice(0, -1).map((s) => s.id)
    const orderedIntermediates = order ? order.map((i) => intermediateIds[i]) : intermediateIds
    const orderedIds = [...orderedIntermediates, last.id]

    return new Response(JSON.stringify({
      orderedIds,
      durationSec: parseDuration(route?.duration),
      distanceMeters: route?.distanceMeters ?? 0,
      legs: (route?.legs ?? []).map((l: any) => ({
        durationSec: parseDuration(l.duration),
        distanceMeters: l.distanceMeters ?? 0,
      })),
      fallback: false,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    try {
      const body = await req.clone().json() as Body
      if (body?.origin && Array.isArray(body?.stops) && body.stops.length >= 2) {
        return new Response(JSON.stringify({
          ...buildFallback(body.origin, body.stops),
          fallback: true,
          fallbackReason: (e as Error).message,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function parseDuration(d: any): number {
  if (!d) return 0
  if (typeof d === 'string' && d.endsWith('s')) return parseInt(d.slice(0, -1), 10) || 0
  return 0
}

// Haversine + nearest-neighbor fallback. Assumes ~13.4 m/s average driving speed (~30 mph).
const AVG_DRIVE_MPS = 13.4
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
function buildFallback(origin: { lat: number; lng: number }, stops: Stop[]) {
  const remaining = [...stops]
  const ordered: Stop[] = []
  let cursor = origin
  while (remaining.length) {
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMeters(cursor, remaining[i])
      if (d < bestDist) { bestDist = d; bestIdx = i }
    }
    const next = remaining.splice(bestIdx, 1)[0]
    ordered.push(next)
    cursor = next
  }
  const legs: { durationSec: number; distanceMeters: number }[] = []
  let prev = origin
  let totalDist = 0
  for (const s of ordered) {
    // Driving distance is typically ~30% more than straight-line.
    const drivingMeters = Math.round(haversineMeters(prev, s) * 1.3)
    legs.push({ distanceMeters: drivingMeters, durationSec: Math.round(drivingMeters / AVG_DRIVE_MPS) })
    totalDist += drivingMeters
    prev = s
  }
  return {
    orderedIds: ordered.map((s) => s.id),
    durationSec: legs.reduce((a, l) => a + l.durationSec, 0),
    distanceMeters: totalDist,
    legs,
  }
}