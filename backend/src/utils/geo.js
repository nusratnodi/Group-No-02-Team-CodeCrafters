import { badRequest } from "./errors.js"

const EARTH_RADIUS_KM = 6371

const toRadians = (degrees) => (degrees * Math.PI) / 180

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineKm(from, to) {
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** A lat/lng box that contains every point within `radiusKm` of the centre. */
export function boundingBox({ lat, lng }, radiusKm) {
  const latDelta = radiusKm / 111.32
  const lngDelta = radiusKm / (111.32 * Math.max(Math.cos(toRadians(lat)), 0.01))
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  }
}

export function isValidCoordinate({ lat, lng }) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

/** Parses `lat` and `lng` values (or a "lat,lng" string) into a coordinate, or throws 400. */
export function parseCoordinate(lat, lng, label = "location") {
  if (lng === undefined && typeof lat === "string" && lat.includes(",")) {
    ;[lat, lng] = lat.split(",")
  }
  const point = { lat: Number(lat), lng: Number(lng) }
  if (lat === undefined || lng === undefined || lat === "" || lng === "" || !isValidCoordinate(point)) {
    throw badRequest(`A valid ${label} (latitude and longitude) is required`)
  }
  return point
}

export const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits
