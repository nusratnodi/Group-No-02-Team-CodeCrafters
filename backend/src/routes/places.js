import { Router } from "express"
import { PLACE_CATEGORIES } from "../models/PlaceModel.js"
import { badRequest, notFound } from "../utils/errors.js"
import { parseId } from "../utils/validate.js"
import { clamp, resolveLocation } from "./helpers.js"

export default function placeRoutes({ models, services }) {
  const router = Router()

  router.get("/nearby", async (req, res) => {
    const center = await resolveLocation(models, req.query)
    const category = req.query.category && req.query.category !== "all" ? String(req.query.category) : undefined
    if (category && !PLACE_CATEGORIES.includes(category)) {
      throw badRequest(`Category must be one of: all, ${PLACE_CATEGORIES.join(", ")}`)
    }
    const sort = req.query.sort === "rating" ? "rating" : "distance"
    const radiusKm = clamp(Number(req.query.radius) || 5, 0.5, 50)
    const limit = clamp(Math.floor(Number(req.query.limit)) || 20, 1, 50)

    const { items, source } = await services.nearby.find(center, { radiusKm, category, sort, limit })
    res.json({ center, radiusKm, items, total: items.length, source })
  })

  router.get("/places/:id", async (req, res) => {
    const place = await models.places.findById(parseId(req.params.id, "place id"))
    if (!place) throw notFound("Place not found")
    res.json({ place })
  })

  return router
}
