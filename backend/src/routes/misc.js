import { Router } from "express"
import { validate } from "../utils/validate.js"
import { newsletterSchema } from "./schemas.js"

/** Health check, newsletter sign-up and admin statistics. */
export default function miscRoutes({ db, models, auth, liveApis }) {
  const router = Router()

  router.get("/health", async (req, res) => {
    let database = "ok"
    try {
      await db.query("SELECT 1")
    } catch {
      database = "unavailable"
    }
    res.status(database === "ok" ? 200 : 503).json({
      status: database === "ok" ? "ok" : "degraded",
      database,
      liveApis,
      time: new Date().toISOString(),
    })
  })

  router.post("/newsletter", async (req, res) => {
    const { email } = validate(req.body, newsletterSchema)
    const created = await models.newsletter.subscribe(email)
    res.status(created ? 201 : 200).json({ message: created ? "You're subscribed!" : "You're already subscribed." })
  })

  router.get("/admin/stats", auth.authenticate, auth.requireAdmin, async (req, res) => {
    const [users, destinations, reviews, trips, subscribers] = await Promise.all([
      models.users.count(),
      models.destinations.count(),
      models.reviews.count(),
      models.trips.count(),
      models.newsletter.count(),
    ])
    res.json({ users, destinations, reviews, trips, subscribers })
  })

  return router
}
