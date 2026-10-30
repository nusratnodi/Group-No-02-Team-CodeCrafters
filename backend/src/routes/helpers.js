import { notFound } from "../utils/errors.js"
import { parseCoordinate } from "../utils/geo.js"

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/** Reads `page` and `limit` query parameters. */
export function pagination(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  const limit = clamp(Math.floor(Number(query.limit)) || defaultLimit, 1, maxLimit)
  const page = Math.max(1, Math.floor(Number(query.page)) || 1)
  return { limit, page, offset: (page - 1) * limit }
}

/**
 * Resolves the location a request is about: either `?destination=<slug|id>`
 * or explicit `?lat=..&lng=..` coordinates.
 */
export async function resolveLocation(models, query) {
  if (query.destination) {
    const destination = await models.destinations.find(query.destination)
    if (!destination) throw notFound("Destination not found")
    return {
      lat: destination.latitude,
      lng: destination.longitude,
      name: destination.name,
      destination: { id: destination.id, slug: destination.slug, name: destination.name },
    }
  }
  const point = parseCoordinate(query.lat, query.lng)
  return { ...point, name: query.name ? String(query.name).slice(0, 80) : null, destination: null }
}
