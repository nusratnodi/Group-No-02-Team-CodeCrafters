import { boundingBox, haversineKm, round } from "../utils/geo.js"

export const PLACE_CATEGORIES = ["restaurant", "hospital", "hotel", "shopping", "atm", "other"]

export function toPlace(row) {
  if (!row) return null
  return {
    id: row.id,
    destinationId: row.destination_id,
    destinationName: row.destination_name ?? null,
    name: row.name,
    category: row.category,
    type: row.type,
    address: row.address,
    phone: row.phone,
    latitude: row.latitude,
    longitude: row.longitude,
    rating: row.rating,
  }
}

const SELECT = `
  SELECT p.*, d.name AS destination_name
  FROM places p LEFT JOIN destinations d ON d.id = p.destination_id`

export class PlaceModel {
  constructor(db) {
    this.db = db
  }

  async findById(id) {
    return toPlace(await this.db.get(`${SELECT} WHERE p.id = ?`, [id]))
  }

  async findByIds(ids) {
    if (!ids.length) return []
    const rows = await this.db.all(`${SELECT} WHERE p.id IN (${ids.map(() => "?").join(", ")})`, ids)
    return rows.map(toPlace)
  }

  /** Places within `radiusKm` of a point, each with its distance, sorted by distance or rating. */
  async findNear({ lat, lng }, { radiusKm = 5, category, sort = "distance", limit = 20 } = {}) {
    const box = boundingBox({ lat, lng }, radiusKm)
    const params = [box.minLat, box.maxLat, box.minLng, box.maxLng]
    let sql = `${SELECT} WHERE p.latitude BETWEEN ? AND ? AND p.longitude BETWEEN ? AND ?`
    if (category) {
      sql += " AND p.category = ?"
      params.push(category)
    }

    const items = (await this.db.all(sql, params))
      .map((row) => ({
        ...toPlace(row),
        distanceKm: round(haversineKm({ lat, lng }, { lat: row.latitude, lng: row.longitude }), 2),
      }))
      .filter((place) => place.distanceKm <= radiusKm)

    items.sort((a, b) =>
      sort === "rating" ? b.rating - a.rating || a.distanceKm - b.distanceKm : a.distanceKm - b.distanceKm,
    )
    return items.slice(0, limit)
  }

  async create({ destinationId = null, name, category, type, address = null, phone = null, latitude, longitude, rating = 0 }) {
    const { rows } = await this.db.run(
      `INSERT INTO places (destination_id, name, category, type, address, phone, latitude, longitude, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [destinationId, name, category, type, address, phone, latitude, longitude, rating],
    )
    return this.findById(rows[0].id)
  }
}
