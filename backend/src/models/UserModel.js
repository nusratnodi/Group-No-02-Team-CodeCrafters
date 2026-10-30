export function toPublicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    location: row.location,
    bio: row.bio,
    createdAt: row.created_at,
  }
}

export class UserModel {
  constructor(db) {
    this.db = db
  }

  findById(id) {
    return this.db.get("SELECT * FROM users WHERE id = ?", [id])
  }

  findByEmail(email) {
    return this.db.get("SELECT * FROM users WHERE lower(email) = lower(?)", [email])
  }

  async create({ name, email, passwordHash, role = "user", location = null, bio = null }) {
    const { rows } = await this.db.run(
      "INSERT INTO users (name, email, password_hash, role, location, bio) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
      [name, email.toLowerCase(), passwordHash, role, location, bio],
    )
    return this.findById(rows[0].id)
  }

  async update(id, { name, location, bio }) {
    const current = await this.findById(id)
    await this.db.run("UPDATE users SET name = ?, location = ?, bio = ? WHERE id = ?", [
      name ?? current.name,
      location === undefined ? current.location : location,
      bio === undefined ? current.bio : bio,
      id,
    ])
    return this.findById(id)
  }

  async updatePassword(id, passwordHash) {
    await this.db.run("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, id])
  }

  async stats(id) {
    const row = await this.db.get(
      `SELECT (SELECT COUNT(*) FROM trips WHERE user_id = $1) AS trips,
              (SELECT COUNT(*) FROM favorites WHERE user_id = $1) AS favorites,
              (SELECT COUNT(*) FROM reviews WHERE user_id = $1) AS reviews`,
      [id],
    )
    return { trips: row.trips, favorites: row.favorites, reviews: row.reviews }
  }

  async count() {
    return (await this.db.get("SELECT COUNT(*) AS count FROM users")).count
  }
}
