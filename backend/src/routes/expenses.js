import { Router } from "express"
import { notFound } from "../utils/errors.js"
import { parseId, validate } from "../utils/validate.js"
import { expenseSchema } from "./schemas.js"

export default function expenseRoutes({ models, auth }) {
  const router = Router()
  router.use(auth.authenticate)

  async function ownedExpense(req) {
    const found = await models.expenses.findWithOwner(parseId(req.params.id, "expense id"))
    if (!found || found.ownerId !== req.user.id) throw notFound("Expense not found")
    return found.expense
  }

  router.put("/:id", async (req, res) => {
    const expense = await ownedExpense(req)
    const data = validate(req.body, expenseSchema, { partial: true })
    res.json({ expense: await models.expenses.update(expense.id, data) })
  })

  router.delete("/:id", async (req, res) => {
    const expense = await ownedExpense(req)
    await models.expenses.delete(expense.id)
    res.status(204).end()
  })

  return router
}
