import { Router } from "express"
import { resolveLocation } from "./helpers.js"

export default function weatherRoutes({ models, services }) {
  const router = Router()

  router.get("/", async (req, res) => {
    const location = await resolveLocation(models, req.query)
    const forecast = await services.weather.getForecast(location, { name: location.name })
    res.json({ ...forecast, location: { ...forecast.location, destination: location.destination } })
  })

  return router
}
