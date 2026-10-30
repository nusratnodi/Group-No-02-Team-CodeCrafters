import type { BudgetStatus, BudgetSummary, ExpenseCategory } from "../api/types"

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ["Transportation", "Accommodation", "Food", "Shopping", "Other"]
export const CURRENCIES = ["USD", "BDT", "EUR", "GBP", "INR"]

/** Chart colours for each expense category (matching the design's legend). */
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Accommodation: "#0e7c86",
  Food: "#ff8a3d",
  Transportation: "#4f93d2",
  Shopping: "#efc04a",
  Other: "#9b8afb",
}

export const STATUS_COLORS: Record<BudgetStatus, string> = {
  "on-track": "var(--success)",
  warning: "var(--warning)",
  over: "var(--error)",
}

/** CSS conic-gradient for the spending donut chart. */
export function donutGradient(byCategory: BudgetSummary["byCategory"]) {
  if (!byCategory.length) return "conic-gradient(#e8edef 0 100%)"
  let start = 0
  const stops = byCategory.map(({ category, percent }, index) => {
    const end = index === byCategory.length - 1 ? 100 : start + percent
    const stop = `${CATEGORY_COLORS[category]} ${start}% ${end}%`
    start = end
    return stop
  })
  return `conic-gradient(${stops.join(", ")})`
}

export function budgetMessage(summary: BudgetSummary, format: (n: number) => string) {
  if (summary.status === "over") return `You're ${format(Math.abs(summary.remaining))} over budget.`
  if (summary.status === "warning") return `Careful — only ${format(summary.remaining)} left.`
  if (summary.totalSpent === 0) return "No expenses yet. Add your first one to start tracking."
  return `You're doing well. ${format(summary.remaining)} remaining.`
}
