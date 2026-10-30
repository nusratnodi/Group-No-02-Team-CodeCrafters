export class NewsletterModel {
  constructor(db) {
    this.db = db
  }

  /** Adds the email to the mailing list; returns false if it was already subscribed. */
  async subscribe(email) {
    const { changes } = await this.db.run(
      "INSERT INTO newsletter_subscribers (email) VALUES (?) ON CONFLICT DO NOTHING",
      [email.toLowerCase()],
    )
    return changes > 0
  }

  async count() {
    return (await this.db.get("SELECT COUNT(*) AS count FROM newsletter_subscribers")).count
  }
}
