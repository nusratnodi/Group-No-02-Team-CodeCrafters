import { Router } from "express"
import { EXPENSE_CATEGORIES } from "../models/ExpenseModel.js"
import { summarizeBudget } from "../services/BudgetService.js"
import { badRequest, notFound } from "../utils/errors.js"
import { parseId, validate } from "../utils/validate.js"
import { expenseSchema, tripSchema } from "./schemas.js"

export default function tripRoutes({ models, auth }) {
  const router = Router()
  router.use(auth.authenticate)

  async function ownedTrip(req) {
    const trip = await models.trips.findById(parseId(req.params.id, "trip id"))
    if (!trip || trip.userId !== req.user.id) throw notFound("Trip not found")
    return trip
  }

  async function checkTrip({ startDate, endDate, destinationId }) {
    if (startDate && endDate && endDate < startDate) {
      throw badRequest("Please check the highlighted fields", { endDate: "End date must be on or after the start date" })
    }
    if (destinationId && !(await models.destinations.findById(destinationId))) throw notFound("Destination not found")
  }

  const withSummary = async (trip) => ({ ...trip, summary: summarizeBudget(trip, await models.expenses.listByTrip(trip.id)) })

  router.get("/", async (req, res) => {
    const trips = await models.trips.listByUser(req.user.id)
    res.json({ items: await Promise.all(trips.map(withSummary)) })
  })

  router.post("/", async (req, res) => {
    const data = validate(req.body, tripSchema)
    await checkTrip(data)
    const trip = await models.trips.create({ userId: req.user.id, ...data })
    res.status(201).json({ trip: await withSummary(trip) })
  })

  router.get("/:id", async (req, res) => {
    const trip = await ownedTrip(req)
    const expenses = await models.expenses.listByTrip(trip.id)
    res.json({ trip, summary: summarizeBudget(trip, expenses), expenses })
  })

  router.put("/:id", async (req, res) => {
    const trip = await ownedTrip(req)
    const data = validate(req.body, tripSchema, { partial: true })
    await checkTrip({ ...trip, ...data, destinationId: data.destinationId })
    res.json({ trip: await withSummary(await models.trips.update(trip.id, data)) })
  })

  router.delete("/:id", async (req, res) => {
    const trip = await ownedTrip(req)
    await models.trips.delete(trip.id)
    res.status(204).end()
  })

  router.get("/:id/expenses", async (req, res) => {
    const trip = await ownedTrip(req)
    const category = req.query.category ? String(req.query.category) : undefined
    if (category && !EXPENSE_CATEGORIES.includes(category)) {
      throw badRequest(`Category must be one of: ${EXPENSE_CATEGORIES.join(", ")}`)
    }
    res.json({ items: await models.expenses.listByTrip(trip.id, { category }) })
  })

  router.post("/:id/expenses", async (req, res) => {
    const trip = await ownedTrip(req)
    const data = validate(req.body, expenseSchema)
    res.status(201).json({ expense: await models.expenses.create({ tripId: trip.id, ...data }) })
  })

  return router
}
