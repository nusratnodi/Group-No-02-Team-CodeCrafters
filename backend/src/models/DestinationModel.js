import { MAX_INT } from "../utils/validate.js"

export const CATEGORIES = ["Beach", "Mountain", "Historical", "City", "Nature"]
export const REGIONS = ["Asia", "Europe", "Americas", "Africa", "Oceania"]
/** Budget bands for the estimated trip cost per person (USD). */
export const BUDGETS = {
  low: { label: "Under $500", min: 0, max: 500 },
  mid: { label: "$500 – $1,500", min: 500, max: 1500 },
  high: { label: "$1,500+", min: 1500, max: Number.MAX_SAFE_INTEGER },
}

const SORTS = {
  recommended: "rating DESC, review_count DESC, d.name ASC",
  rating: "rating DESC, d.name ASC",
  popular: "review_count DESC, rating DESC",
  price_low: "d.avg_cost ASC, d.name ASC",
  price_high: "d.avg_cost DESC, d.name ASC",
  name: "d.name ASC",
  newest: "d.created_at DESC, d.id DESC",
}
export const SORT_OPTIONS = Object.keys(SORTS)

// Maps API (camelCase) fields to database columns.
const COLUMNS = {
  name: "name",
  location: "location",
  country: "country",
  region: "region",
  category: "category",
  tag: "tag",
  summary: "summary",
  description: "description",
  imageUrl: "image_url",
  gallery: "gallery",
  latitude: "latitude",
  longitude: "longitude",
  bestTime: "best_time",
  entryFee: "entry_fee",
  openingHours: "opening_hours",
  gettingThere: "getting_there",
  localTip: "local_tip",
  avgCost: "avg_cost",
}

const SELECT_WITH_RATING = `
  SELECT d.*, COALESCE(r.avg_rating, 0) AS rating, COALESCE(r.review_count, 0) AS review_count
  FROM destinations d
  LEFT JOIN (
    SELECT destination_id, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS review_count
    FROM reviews GROUP BY destination_id
  ) r ON r.destination_id = d.id`

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function toDestination(row) {
  if (!row) return null
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    location: row.location,
    country: row.country,
    region: row.region,
    category: row.category,
    tag: row.tag,
    summary: row.summary,
    description: row.description,
    imageUrl: row.image_url,
    gallery: row.gallery ?? [],
    latitude: row.latitude,
    longitude: row.longitude,
    bestTime: row.best_time,
    entryFee: row.entry_fee,
    openingHours: row.opening_hours,
    gettingThere: row.getting_there,
    localTip: row.local_tip,
    avgCost: row.avg_cost,
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    createdAt: row.created_at,
  }
}

/** Column value for an API field (the gallery list is stored as JSONB). */
const columnValue = (key, data) => (key === "gallery" ? JSON.stringify(data.gallery ?? []) : data[key])

export class DestinationModel {
  constructor(db) {
    this.db = db
  }

  /** Searches destinations with optional text query, filters, sorting and pagination. */
  async search({ q, categories = [], regions = [], budgets = [], minRating = 0, sort = "recommended", limit = 12, offset = 0 } = {}) {
    const where = []
    const params = []

    if (q) {
      where.push("(d.name ILIKE ? OR d.location ILIKE ? OR d.country ILIKE ? OR d.category ILIKE ? OR d.tag ILIKE ?)")
      params.push(...Array(5).fill(`%${q}%`))
    }
    if (categories.length) {
      where.push(`d.category IN (${categories.map(() => "?").join(", ")})`)
      params.push(...categories)
    }
    if (regions.length) {
      where.push(`d.region IN (${regions.map(() => "?").join(", ")})`)
      params.push(...regions)
    }
    if (budgets.length) {
      where.push(`(${budgets.map(() => "(d.avg_cost >= ? AND d.avg_cost < ?)").join(" OR ")})`)
      for (const key of budgets) params.push(BUDGETS[key].min, BUDGETS[key].max)
    }
    if (minRating > 0) {
      where.push("COALESCE(r.avg_rating, 0) >= ?")
      params.push(minRating)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
    const { count } = await this.db.get(`SELECT COUNT(*) AS count FROM (${SELECT_WITH_RATING} ${whereSql}) AS matches`, params)
    const rows = await this.db.all(
      `${SELECT_WITH_RATING} ${whereSql} ORDER BY ${SORTS[sort] || SORTS.recommended} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )
    return { items: rows.map(toDestination), total: count }
  }

  async findById(id) {
    return toDestination(await this.db.get(`${SELECT_WITH_RATING} WHERE d.id = ?`, [id]))
  }

  async findBySlug(slug) {
    return toDestination(await this.db.get(`${SELECT_WITH_RATING} WHERE d.slug = ?`, [slug]))
  }

  /** Accepts a numeric id or a slug. */
  async find(idOrSlug) {
    if (!/^\d+$/.test(String(idOrSlug))) return this.findBySlug(String(idOrSlug))
    const id = Number(idOrSlug)
    return id > 0 && id <= MAX_INT ? this.findById(id) : null
  }

  async findByIds(ids) {
    if (!ids.length) return []
    const rows = await this.db.all(`${SELECT_WITH_RATING} WHERE d.id IN (${ids.map(() => "?").join(", ")})`, ids)
    return rows.map(toDestination)
  }

  async uniqueSlug(name, ignoreId = null) {
    const base = slugify(name) || "destination"
    let slug = base
    for (let n = 2; ; n++) {
      const existing = await this.db.get("SELECT id FROM destinations WHERE slug = ?", [slug])
      if (!existing || existing.id === ignoreId) return slug
      slug = `${base}-${n}`
    }
  }

  async create(data) {
    const fields = Object.keys(COLUMNS).filter((key) => data[key] !== undefined)
    const columns = ["slug", ...fields.map((key) => COLUMNS[key])]
    const values = [await this.uniqueSlug(data.name), ...fields.map((key) => columnValue(key, data))]
    if (data.createdAt) {
      columns.push("created_at")
      values.push(data.createdAt)
    }
    const { rows } = await this.db.run(
      `INSERT INTO destinations (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")}) RETURNING id`,
      values,
    )
    return this.findById(rows[0].id)
  }

  async update(id, data) {
    const fields = Object.keys(COLUMNS).filter((key) => data[key] !== undefined)
    if (!fields.length) return this.findById(id)
    const assignments = fields.map((key) => `${COLUMNS[key]} = ?`)
    const values = fields.map((key) => columnValue(key, data))
    if (data.name) {
      assignments.push("slug = ?")
      values.push(await this.uniqueSlug(data.name, id))
    }
    await this.db.run(`UPDATE destinations SET ${assignments.join(", ")} WHERE id = ?`, [...values, id])
    return this.findById(id)
  }

  delete(id) {
    return this.db.transaction(async (tx) => {
      await tx.run("DELETE FROM favorites WHERE item_type = 'destination' AND item_id = ?", [id])
      return (await tx.run("DELETE FROM destinations WHERE id = ?", [id])).changes > 0
    })
  }

  async count() {
    return (await this.db.get("SELECT COUNT(*) AS count FROM destinations")).count
  }
}
