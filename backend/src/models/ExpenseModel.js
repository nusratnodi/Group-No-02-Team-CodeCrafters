export const EXPENSE_CATEGORIES = ["Transportation", "Accommodation", "Food", "Shopping", "Other"]

export function toExpense(row) {
  if (!row) return null
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    category: row.category,
    amount: row.amount,
    spentOn: row.spent_on,
    note: row.note,
    createdAt: row.created_at,
  }
}

export class ExpenseModel {
  constructor(db) {
    this.db = db
  }

  async listByTrip(tripId, { category } = {}) {
    const params = [tripId]
    let sql = "SELECT * FROM expenses WHERE trip_id = ?"
    if (category) {
      sql += " AND category = ?"
      params.push(category)
    }
    return (await this.db.all(`${sql} ORDER BY spent_on DESC, id DESC`, params)).map(toExpense)
  }

  /** The expense together with the id of the user who owns its trip. */
  async findWithOwner(id) {
    const row = await this.db.get(
      "SELECT e.*, t.user_id AS owner_id FROM expenses e JOIN trips t ON t.id = e.trip_id WHERE e.id = ?",
      [id],
    )
    return row ? { expense: toExpense(row), ownerId: row.owner_id } : null
  }

  async findById(id) {
    return toExpense(await this.db.get("SELECT * FROM expenses WHERE id = ?", [id]))
  }

  async create({ tripId, title, category, amount, spentOn, note = null }) {
    const { rows } = await this.db.run(
      "INSERT INTO expenses (trip_id, title, category, amount, spent_on, note) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
      [tripId, title, category, amount, spentOn, note],
    )
    return this.findById(rows[0].id)
  }

  async update(id, data) {
    const current = await this.findById(id)
    await this.db.run("UPDATE expenses SET title = ?, category = ?, amount = ?, spent_on = ?, note = ? WHERE id = ?", [
      data.title ?? current.title,
      data.category ?? current.category,
      data.amount ?? current.amount,
      data.spentOn ?? current.spentOn,
      data.note === undefined ? current.note : data.note,
      id,
    ])
    return this.findById(id)
  }

  async delete(id) {
    return (await this.db.run("DELETE FROM expenses WHERE id = ?", [id])).changes > 0
  }
}
