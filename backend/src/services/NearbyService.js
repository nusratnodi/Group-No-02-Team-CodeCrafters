import { haversineKm, round } from "../utils/geo.js"
import { fetchJson } from "../utils/http.js"

/** OpenStreetMap tags that correspond to each Tripza place category. */
const OSM_FILTERS = {
  restaurant: ['["amenity"~"^(restaurant|cafe|fast_food)$"]'],
  hospital: ['["amenity"~"^(hospital|clinic|pharmacy|doctors)$"]'],
  hotel: ['["tourism"~"^(hotel|guest_house|hostel|motel|resort)$"]'],
  shopping: ['["shop"~"^(mall|supermarket|department_store|gift|clothes|marketplace)$"]', '["amenity"="marketplace"]'],
  atm: ['["amenity"~"^(atm|bank)$"]'],
  other: ['["tourism"~"^(attraction|viewpoint|museum)$"]'],
}

function categoryFromTags(tags) {
  if (/restaurant|cafe|fast_food/.test(tags.amenity)) return "restaurant"
  if (/hospital|clinic|pharmacy|doctors/.test(tags.amenity)) return "hospital"
  if (/hotel|guest_house|hostel|motel|resort/.test(tags.tourism)) return "hotel"
  if (tags.shop || tags.amenity === "marketplace") return "shopping"
  if (/atm|bank/.test(tags.amenity)) return "atm"
  return "other"
}

function typeFromTags(tags) {
  const raw = tags.cuisine ? `${tags.cuisine.split(";")[0]} ${tags.amenity}` : tags.amenity || tags.tourism || tags.shop || "place"
  const text = raw.replace(/_/g, " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export class NearbyService {
  constructor({ places, liveApis = true }) {
    this.places = places
    this.liveApis = liveApis
  }

  async #overpass(center, { radiusKm, category, limit }) {
    const filters = category ? OSM_FILTERS[category] : Object.values(OSM_FILTERS).flat()
    const radius = Math.round(Math.min(radiusKm, 10) * 1000)
    const body = `[out:json][timeout:8];(${filters
      .map((filter) => `nwr(around:${radius},${center.lat},${center.lng})${filter}["name"];`)
      .join("")});out center ${limit * 2};`
    const data = await fetchJson("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: new URLSearchParams({ data: body }),
      timeoutMs: 9000,
    })
    return data.elements
      .map((element) => {
        const lat = element.lat ?? element.center?.lat
        const lng = element.lon ?? element.center?.lon
        const tags = element.tags ?? {}
        return {
          id: `osm-${element.type}-${element.id}`,
          external: true,
          destinationId: null,
          destinationName: null,
          name: tags.name,
          category: categoryFromTags(tags),
          type: typeFromTags(tags),
          address: [tags["addr:street"], tags["addr:city"]].filter(Boolean).join(", ") || null,
          phone: tags.phone ?? null,
          latitude: lat,
          longitude: lng,
          rating: null,
          distanceKm: round(haversineKm(center, { lat, lng }), 2),
        }
      })
      .filter((place) => place.latitude != null)
  }

  /**
   * Useful places around a point. Uses Tripza's curated places first; if there are none in range
   * and live APIs are enabled, falls back to OpenStreetMap (Overpass API).
   */
  async find(center, { radiusKm = 5, category, sort = "distance", limit = 20 } = {}) {
    const items = await this.places.findNear(center, { radiusKm, category, sort, limit })
    if (items.length || !this.liveApis) return { items, source: "tripza" }

    try {
      const live = await this.#overpass(center, { radiusKm, category, limit })
      live.sort((a, b) => a.distanceKm - b.distanceKm)
      return { items: live.slice(0, limit), source: "openstreetmap" }
    } catch {
      return { items: [], source: "tripza" }
    }
  }
}
