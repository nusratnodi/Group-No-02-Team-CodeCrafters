import { haversineKm, round } from "../utils/geo.js"
import { fetchJson } from "../utils/http.js"

export const TRAVEL_MODES = ["car", "bus", "walk"]

const OSRM_PROFILES = {
  car: "routed-car/route/v1/driving",
  bus: "routed-car/route/v1/driving",
  walk: "routed-foot/route/v1/foot",
}
/** Average speeds (km/h) used when no live routing is available. */
const FALLBACK_SPEED = { car: 45, bus: 30, walk: 4.8 }
/** Buses follow roads but stop often, so they take longer than a car on the same route. */
const BUS_SLOWDOWN = 1.35
const GOOGLE_MODES = { car: "driving", bus: "transit", walk: "walking" }

export function formatDuration(minutes) {
  const total = Math.max(1, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (!hours) return `${mins} min`
  return mins ? `${hours} hr ${mins} min` : `${hours} hr`
}

export function navigationUrl(from, to, mode) {
  const params = new URLSearchParams({
    api: "1",
    origin: `${from.lat},${from.lng}`,
    destination: `${to.lat},${to.lng}`,
    travelmode: GOOGLE_MODES[mode],
  })
  return `https://www.google.com/maps/dir/?${params}`
}

/** Straight-line estimate, adjusted for roads not being straight. */
export function estimateRoute(from, to, mode) {
  const distanceKm = haversineKm(from, to) * 1.3
  return {
    distanceKm,
    durationMin: (distanceKm / FALLBACK_SPEED[mode]) * 60,
    geometry: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    via: null,
    source: "estimate",
  }
}

export class RouteService {
  constructor({ liveApis = true } = {}) {
    this.liveApis = liveApis
  }

  async #fetchOsrm(from, to, mode) {
    const url = `https://routing.openstreetmap.de/${OSRM_PROFILES[mode]}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=simplified&geometries=geojson`
    const data = await fetchJson(url, { timeoutMs: 8000 })
    const route = data.routes?.[0]
    if (data.code !== "Ok" || !route) throw new Error("No route found")
    const durationMin = (route.duration / 60) * (mode === "bus" ? BUS_SLOWDOWN : 1)
    return {
      distanceKm: route.distance / 1000,
      durationMin,
      geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      via: route.legs?.[0]?.summary || null,
      source: "openstreetmap",
    }
  }

  /** Distance, duration and a drawable path between two points for the chosen travel mode. */
  async getRoute(from, to, mode = "car") {
    let route = null
    if (this.liveApis) {
      try {
        route = await this.#fetchOsrm(from, to, mode)
      } catch {
        route = null
      }
    }
    route ??= estimateRoute(from, to, mode)

    const notes = [`${round(route.distanceKm)} km`]
    if (route.via) notes.push(`Via ${route.via}`)
    if (mode === "bus") notes.push("Bus time includes stops")
    notes.push(route.source === "openstreetmap" ? "OpenStreetMap routing" : "Estimated route")

    return {
      mode,
      from,
      to,
      distanceKm: round(route.distanceKm),
      durationMin: Math.round(route.durationMin),
      durationText: formatDuration(route.durationMin),
      via: route.via,
      geometry: route.geometry,
      notes,
      source: route.source,
      navigationUrl: navigationUrl(from, to, mode),
    }
  }
}
