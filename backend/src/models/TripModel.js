export const CURRENCIES = ["USD", "BDT", "EUR", "GBP", "INR"]

export function toTrip(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    destinationId: row.destination_id,
    destinationName: row.destination_name ?? null,
    destinationSlug: row.destination_slug ?? null,
    destinationImage: row.destination_image ?? null,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    budget: row.budget,
    currency: row.currency,
    totalSpent: Math.round((row.total_spent ?? 0) * 100) / 100,
    createdAt: row.created_at,
  }
}

const SELECT = `
  SELECT t.*, d.name AS destination_name, d.slug AS destination_slug, d.image_url AS destination_image,
         (SELECT COALESCE(SUM(amount), 0) FROM expenses e WHERE e.trip_id = t.id) AS total_spent
  FROM trips t LEFT JOIN destinations d ON d.id = t.destination_id`

export class TripModel {
  constructor(db) {
    this.db = db
  }

  async listByUser(userId) {
    const rows = await this.db.all(`${SELECT} WHERE t.user_id = ? ORDER BY t.start_date ASC, t.id ASC`, [userId])
    return rows.map(toTrip)
  }

  async findById(id) {
    return toTrip(await this.db.get(`${SELECT} WHERE t.id = ?`, [id]))
  }

  async create({ userId, destinationId = null, name, startDate, endDate, budget, currency = "USD" }) {
    const { rows } = await this.db.run(
      "INSERT INTO trips (user_id, destination_id, name, start_date, end_date, budget, currency) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
      [userId, destinationId, name, startDate, endDate, budget, currency],
    )
    return this.findById(rows[0].id)
  }

  async update(id, data) {
    const current = await this.findById(id)
    await this.db.run(
      "UPDATE trips SET destination_id = ?, name = ?, start_date = ?, end_date = ?, budget = ?, currency = ? WHERE id = ?",
      [
        data.destinationId === undefined ? current.destinationId : data.destinationId,
        data.name ?? current.name,
        data.startDate ?? current.startDate,
        data.endDate ?? current.endDate,
        data.budget ?? current.budget,
        data.currency ?? current.currency,
        id,
      ],
    )
    return this.findById(id)
  }

  async delete(id) {
    return (await this.db.run("DELETE FROM trips WHERE id = ?", [id])).changes > 0
  }

  async count() {
    return (await this.db.get("SELECT COUNT(*) AS count FROM trips")).count
  }
}
