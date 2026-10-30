import { Router } from "express"
import { TRAVEL_MODES } from "../services/RouteService.js"
import { badRequest, notFound } from "../utils/errors.js"
import { parseCoordinate } from "../utils/geo.js"

export default function navigationRoutes({ models, services }) {
  const router = Router()

  router.get("/route", async (req, res) => {
    const mode = req.query.mode || "car"
    if (!TRAVEL_MODES.includes(mode)) throw badRequest(`Mode must be one of: ${TRAVEL_MODES.join(", ")}`)
    const from = parseCoordinate(req.query.from, undefined, "starting point")

    let to
    if (req.query.destination) {
      const destination = await models.destinations.find(req.query.destination)
      if (!destination) throw notFound("Destination not found")
      to = { lat: destination.latitude, lng: destination.longitude }
    } else {
      to = parseCoordinate(req.query.to, undefined, "destination")
    }

    res.json({ route: await services.routes.getRoute(from, to, mode) })
  })

  router.get("/geocode", async (req, res) => {
    const query = String(req.query.q || "").trim()
    if (query.length < 2) throw badRequest("Search text must be at least 2 characters")
    res.json({ results: await services.geocode.search(query.slice(0, 120)) })
  })

  return router
}
