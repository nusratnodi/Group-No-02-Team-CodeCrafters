import { describe, expect, it } from "vitest"
import type { BudgetSummary, Trip } from "../api/types"
import { defaultTrip } from "../pages/ExpensesPage"
import { budgetMessage, donutGradient } from "./budget"
import { daysUntil, formatDateRange, formatDistance, formatMoney, initials, plural, timeAgo } from "./format"

describe("format helpers", () => {
  it("TC-FE-01 formats money in the trip currency", () => {
    expect(formatMoney(1842.5, "USD")).toBe("$1,842.50")
    expect(formatMoney(30000, "BDT", 0)).toBe("৳30,000")
    expect(formatMoney(12, "EUR")).toBe("€12.00")
  })

  it("TC-FE-02 formats date ranges like the design (Jun 16–22)", () => {
    const today = new Date(2030, 0, 1)
    expect(formatDateRange("2030-06-16", "2030-06-22", today)).toBe("Jun 16–22")
    expect(formatDateRange("2030-11-28", "2030-12-02", today)).toBe("Nov 28 – Dec 2")
    expect(formatDateRange("2031-01-05", "2031-01-07", today)).toBe("Jan 5–7, 2031")
    expect(formatDateRange("2030-03-03", "2030-03-03", today)).toBe("Mar 3")
  })

  it("TC-FE-03 counts days until a date and describes how long ago something happened", () => {
    const today = new Date(2030, 5, 10, 15, 30)
    expect(daysUntil("2030-06-22", today)).toBe(12)
    expect(daysUntil("2030-06-10", today)).toBe(0)
    const now = new Date("2030-06-10T12:00:00Z")
    expect(timeAgo("2030-06-10 11:59:30", now)).toBe("just now")
    expect(timeAgo("2030-06-08 12:00:00", now)).toBe("2 days ago")
    expect(timeAgo("2030-05-27 12:00:00", now)).toBe("2 weeks ago")
  })

  it("TC-FE-04 builds initials, distances and plurals", () => {
    expect(initials("Maimuna Nowshen Mahima")).toBe("MN")
    expect(initials("safin")).toBe("S")
    expect(formatDistance(0.4)).toBe("400 m")
    expect(formatDistance(2.345)).toBe("2.3 km")
    expect(formatDistance(42.7)).toBe("43 km")
    expect(plural(1, "review")).toBe("1 review")
    expect(plural(2418, "review")).toBe("2,418 reviews")
  })
})

describe("budget helpers", () => {
  const summary: BudgetSummary = {
    budget: 1000,
    currency: "USD",
    totalSpent: 800,
    remaining: 200,
    percentUsed: 80,
    status: "warning",
    days: 7,
    daysLeft: 3,
    perDayRemaining: 66.67,
    expenseCount: 2,
    byCategory: [
      { category: "Accommodation", amount: 600, percent: 75 },
      { category: "Food", amount: 200, percent: 25 },
    ],
  }

  it("TC-FE-05 draws the spending donut from category percentages", () => {
    expect(donutGradient(summary.byCategory)).toBe("conic-gradient(#0e7c86 0% 75%, #ff8a3d 75% 100%)")
    expect(donutGradient([])).toBe("conic-gradient(#e8edef 0 100%)")
  })

  it("TC-FE-06 explains the budget status in words", () => {
    const money = (n: number) => `$${n}`
    expect(budgetMessage(summary, money)).toBe("Careful — only $200 left.")
    expect(budgetMessage({ ...summary, status: "over", remaining: -50 }, money)).toBe("You're $50 over budget.")
    expect(budgetMessage({ ...summary, status: "on-track", totalSpent: 0 }, money)).toMatch(/No expenses yet/)
    expect(budgetMessage({ ...summary, status: "on-track" }, money)).toBe("You're doing well. $200 remaining.")
  })

  it("TC-FE-07 opens the next upcoming trip first", () => {
    const trip = (id: number, startDate: string, endDate: string) => ({ id, startDate, endDate }) as Trip
    const trips = [trip(1, "2030-01-01", "2030-01-03"), trip(2, "2030-03-01", "2030-03-05"), trip(3, "2030-05-01", "2030-05-02")]
    expect(defaultTrip(trips, "2030-02-15")?.id).toBe(2)
    expect(defaultTrip(trips, "2030-03-04")?.id).toBe(2)
    expect(defaultTrip(trips, "2030-12-01")?.id).toBe(3)
    expect(defaultTrip([], "2030-12-01")).toBeUndefined()
  })
})
