export const FAVORITE_TYPES = ["destination", "place"]

export class FavoriteModel {
  constructor(db, { destinations, places }) {
    this.db = db
    this.destinations = destinations
    this.places = places
  }

  /** The user's saved destinations and places, newest first. */
  async list(userId) {
    const rows = await this.db.all(
      "SELECT item_type, item_id, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC, id DESC",
      [userId],
    )
    const resolve = async (type, model) => {
      const saved = rows.filter((row) => row.item_type === type)
      const byId = new Map((await model.findByIds(saved.map((row) => row.item_id))).map((item) => [item.id, item]))
      return saved
        .filter((row) => byId.has(row.item_id))
        .map((row) => ({ ...byId.get(row.item_id), savedAt: row.created_at }))
    }

    return {
      destinations: await resolve("destination", this.destinations),
      places: await resolve("place", this.places),
    }
  }

  async exists(userId, itemType, itemId) {
    const row = await this.db.get("SELECT 1 FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?", [
      userId,
      itemType,
      itemId,
    ])
    return Boolean(row)
  }

  /** Saves an item; returns false if it was already saved. */
  async add(userId, itemType, itemId) {
    const { changes } = await this.db.run(
      "INSERT INTO favorites (user_id, item_type, item_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
      [userId, itemType, itemId],
    )
    return changes > 0
  }

  async remove(userId, itemType, itemId) {
    const { changes } = await this.db.run("DELETE FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?", [
      userId,
      itemType,
      itemId,
    ])
    return changes > 0
  }
}
