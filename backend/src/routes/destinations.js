import { Router } from "express"
import { BUDGETS, CATEGORIES, REGIONS, SORT_OPTIONS } from "../models/DestinationModel.js"
import { badRequest, notFound } from "../utils/errors.js"
import { parseId, parseList, validate } from "../utils/validate.js"
import { pagination } from "./helpers.js"
import { destinationSchema } from "./schemas.js"

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()

export default function destinationRoutes({ models, auth }) {
  const router = Router()

  router.get("/", async (req, res) => {
    const sort = req.query.sort || "recommended"
    if (!SORT_OPTIONS.includes(sort)) throw badRequest(`Sort must be one of: ${SORT_OPTIONS.join(", ")}`)
    const { limit, page, offset } = pagination(req.query)

    const { items, total } = await models.destinations.search({
      q: req.query.q ? String(req.query.q).trim().slice(0, 80) : "",
      categories: parseList(req.query.category).map(capitalize).filter((c) => CATEGORIES.includes(c)),
      regions: parseList(req.query.region).map(capitalize).filter((r) => REGIONS.includes(r)),
      budgets: parseList(req.query.budget).filter((b) => b in BUDGETS),
      minRating: Number(req.query.minRating) || 0,
      sort,
      limit,
      offset,
    })
    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) })
  })

  router.get("/meta", (req, res) => {
    res.json({
      categories: CATEGORIES,
      regions: REGIONS,
      budgets: Object.entries(BUDGETS).map(([id, { label }]) => ({ id, label })),
      sorts: SORT_OPTIONS,
    })
  })

  router.get("/:idOrSlug", async (req, res) => {
    const destination = await models.destinations.find(req.params.idOrSlug)
    if (!destination) throw notFound("Destination not found")
    res.json({ destination })
  })

  router.post("/", auth.authenticate, auth.requireAdmin, async (req, res) => {
    const data = validate(req.body, destinationSchema)
    res.status(201).json({ destination: await models.destinations.create(data) })
  })

  router.put("/:id", auth.authenticate, auth.requireAdmin, async (req, res) => {
    const id = parseId(req.params.id, "destination id")
    if (!(await models.destinations.findById(id))) throw notFound("Destination not found")
    const data = validate(req.body, destinationSchema, { partial: true })
    res.json({ destination: await models.destinations.update(id, data) })
  })

  router.delete("/:id", auth.authenticate, auth.requireAdmin, async (req, res) => {
    const id = parseId(req.params.id, "destination id")
    if (!(await models.destinations.delete(id))) throw notFound("Destination not found")
    res.status(204).end()
  })

  return router
}
