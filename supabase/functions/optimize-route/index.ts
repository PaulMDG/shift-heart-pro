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
      return new Response(JSON.stringify({ error: 'Routes API error', status: resp.status, body: text }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
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