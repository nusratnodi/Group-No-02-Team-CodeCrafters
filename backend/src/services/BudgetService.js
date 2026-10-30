import { EXPENSE_CATEGORIES } from "../models/ExpenseModel.js"

const DAY_MS = 24 * 60 * 60 * 1000
const money = (value) => Math.round(value * 100) / 100

const toUtcDay = (value) => {
  if (value instanceof Date) return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
  const [year, month, day] = value.split("-").map(Number)
  return Date.UTC(year, month - 1, day)
}

/** Number of calendar days from `start` to `end`, counting both ends. */
export function tripLength(startDate, endDate) {
  return Math.max(1, Math.round((toUtcDay(endDate) - toUtcDay(startDate)) / DAY_MS) + 1)
}

/** Days of the trip still ahead of `today` (including today while the trip is running). */
export function daysRemaining(startDate, endDate, today = new Date()) {
  const from = Math.max(toUtcDay(today), toUtcDay(startDate))
  const end = toUtcDay(endDate)
  return from > end ? 0 : Math.round((end - from) / DAY_MS) + 1
}

/**
 * Builds the budget overview shown on the expense tracker:
 * totals, percentage used, status, per-day allowance and a breakdown by category.
 */
export function summarizeBudget(trip, expenses, today = new Date()) {
  const totalSpent = money(expenses.reduce((sum, expense) => sum + expense.amount, 0))
  const remaining = money(trip.budget - totalSpent)
  const percentUsed = trip.budget > 0 ? Math.round((totalSpent / trip.budget) * 1000) / 10 : totalSpent > 0 ? 100 : 0
  const days = tripLength(trip.startDate, trip.endDate)
  const daysLeft = daysRemaining(trip.startDate, trip.endDate, today)

  const byCategory = EXPENSE_CATEGORIES.map((category) => {
    const amount = money(expenses.filter((expense) => expense.category === category).reduce((sum, e) => sum + e.amount, 0))
    return { category, amount, percent: totalSpent > 0 ? Math.round((amount / totalSpent) * 1000) / 10 : 0 }
  })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  let status = "on-track"
  if (percentUsed > 100) status = "over"
  else if (percentUsed >= 80) status = "warning"

  return {
    budget: trip.budget,
    currency: trip.currency,
    totalSpent,
    remaining,
    percentUsed,
    status,
    days,
    daysLeft,
    perDayRemaining: remaining > 0 && daysLeft > 0 ? money(remaining / daysLeft) : 0,
    expenseCount: expenses.length,
    byCategory,
  }
}
