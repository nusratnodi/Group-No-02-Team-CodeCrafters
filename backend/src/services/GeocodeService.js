import { fetchJson } from "../utils/http.js"

export class GeocodeService {
  constructor({ destinations, liveApis = true }) {
    this.destinations = destinations
    this.liveApis = liveApis
  }

  async #nominatim(query) {
    const url = new URL("https://nominatim.openstreetmap.org/search")
    url.search = new URLSearchParams({ q: query, format: "json", limit: "5" })
    const results = await fetchJson(url, { timeoutMs: 6000, headers: { "Accept-Language": "en" } })
    return results.map((item) => ({
      name: item.display_name.split(",")[0],
      label: item.display_name,
      lat: Number(item.lat),
      lng: Number(item.lon),
      type: "place",
    }))
  }

  /**
   * Finds Tripza destinations whose name matches, then (when online) any city or address
   * via OpenStreetMap Nominatim.
   */
  async search(query, { limit = 8 } = {}) {
    const needle = query.toLowerCase()
    const { items } = await this.destinations.search({ q: query, limit: 10 })
    const local = items
      .filter((destination) => destination.name.toLowerCase().includes(needle))
      .slice(0, 4)
      .map((destination) => ({
        name: destination.name,
        label: destination.location,
        lat: destination.latitude,
        lng: destination.longitude,
        type: "destination",
        slug: destination.slug,
      }))

    let remote = []
    if (this.liveApis) {
      try {
        remote = await this.#nominatim(query)
      } catch {
        remote = []
      }
    }
    return [...local, ...remote].slice(0, limit)
  }
}
