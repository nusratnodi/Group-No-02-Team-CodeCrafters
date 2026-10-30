export function toReview(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    destinationId: row.destination_id,
    destinationName: row.destination_name,
    destinationSlug: row.destination_slug,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const SELECT = `
  SELECT r.*, u.name AS user_name, d.name AS destination_name, d.slug AS destination_slug
  FROM reviews r
  JOIN users u ON u.id = r.user_id
  JOIN destinations d ON d.id = r.destination_id`

export class ReviewModel {
  constructor(db) {
    this.db = db
  }

  #filters({ destinationId, userId }) {
    const where = []
    const params = []
    if (destinationId) {
      where.push("r.destination_id = ?")
      params.push(destinationId)
    }
    if (userId) {
      where.push("r.user_id = ?")
      params.push(userId)
    }
    return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", params }
  }

  async list({ destinationId, userId, limit = 20, offset = 0 } = {}) {
    const { sql, params } = this.#filters({ destinationId, userId })
    const { count } = await this.db.get(`SELECT COUNT(*) AS count FROM reviews r ${sql}`, params)
    const rows = await this.db.all(`${SELECT} ${sql} ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`, [
      ...params,
      limit,
      offset,
    ])
    return { items: rows.map(toReview), total: count }
  }

  /** Average rating, count and a 1–5 star distribution (in percent). */
  async summary({ destinationId, userId } = {}) {
    const { sql, params } = this.#filters({ destinationId, userId })
    const rows = await this.db.all(`SELECT r.rating, COUNT(*) AS count FROM reviews r ${sql} GROUP BY r.rating`, params)
    const count = rows.reduce((sum, row) => sum + row.count, 0)
    const total = rows.reduce((sum, row) => sum + row.rating * row.count, 0)
    const distribution = {}
    for (let stars = 5; stars >= 1; stars--) {
      const row = rows.find((item) => item.rating === stars)
      distribution[stars] = count ? Math.round(((row?.count ?? 0) / count) * 100) : 0
    }
    return { average: count ? Math.round((total / count) * 10) / 10 : 0, count, distribution }
  }

  async findById(id) {
    return toReview(await this.db.get(`${SELECT} WHERE r.id = ?`, [id]))
  }

  async findByUserAndDestination(userId, destinationId) {
    return toReview(await this.db.get(`${SELECT} WHERE r.user_id = ? AND r.destination_id = ?`, [userId, destinationId]))
  }

  async create({ userId, destinationId, rating, comment, createdAt = new Date() }) {
    const { rows } = await this.db.run(
      "INSERT INTO reviews (user_id, destination_id, rating, comment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
      [userId, destinationId, rating, comment, createdAt, createdAt],
    )
    return this.findById(rows[0].id)
  }

  async update(id, { rating, comment }) {
    const current = await this.findById(id)
    await this.db.run("UPDATE reviews SET rating = ?, comment = ?, updated_at = now() WHERE id = ?", [
      rating ?? current.rating,
      comment ?? current.comment,
      id,
    ])
    return this.findById(id)
  }

  async delete(id) {
    return (await this.db.run("DELETE FROM reviews WHERE id = ?", [id])).changes > 0
  }

  async count() {
    return (await this.db.get("SELECT COUNT(*) AS count FROM reviews")).count
  }
}
