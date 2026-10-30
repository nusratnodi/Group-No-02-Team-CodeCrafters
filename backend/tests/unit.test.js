import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { daysRemaining, summarizeBudget, tripLength } from "../src/services/BudgetService.js"
import { estimateRoute, formatDuration } from "../src/services/RouteService.js"
import { describeWeather, simulatedForecast, travelSuggestion } from "../src/services/WeatherService.js"
import { haversineKm, parseCoordinate } from "../src/utils/geo.js"
import { validate } from "../src/utils/validate.js"

describe("BudgetService", () => {
  const trip = { budget: 1000, currency: "USD", startDate: "2030-06-16", endDate: "2030-06-22" }

  test("TC-UNIT-01 counts trip days inclusively and the days still ahead", () => {
    assert.equal(tripLength("2030-06-16", "2030-06-22"), 7)
    assert.equal(tripLength("2030-06-16", "2030-06-16"), 1)
    assert.equal(daysRemaining("2030-06-16", "2030-06-22", new Date(2030, 5, 20)), 3)
    assert.equal(daysRemaining("2030-06-16", "2030-06-22", new Date(2030, 0, 1)), 7)
    assert.equal(daysRemaining("2030-06-16", "2030-06-22", new Date(2030, 11, 1)), 0)
  })

  test("TC-UNIT-02 summarises spending by category and budget status", () => {
    const expenses = [
      { category: "Food", amount: 150 },
      { category: "Accommodation", amount: 600 },
      { category: "Food", amount: 50 },
    ]
    const summary = summarizeBudget(trip, expenses, new Date(2030, 5, 20))
    assert.equal(summary.totalSpent, 800)
    assert.equal(summary.remaining, 200)
    assert.equal(summary.percentUsed, 80)
    assert.equal(summary.status, "warning")
    assert.equal(summary.perDayRemaining, 66.67)
    assert.deepEqual(summary.byCategory, [
      { category: "Accommodation", amount: 600, percent: 75 },
      { category: "Food", amount: 200, percent: 25 },
    ])
  })

  test("TC-UNIT-03 flags overspending", () => {
    const summary = summarizeBudget(trip, [{ category: "Shopping", amount: 1200.5 }])
    assert.equal(summary.status, "over")
    assert.equal(summary.remaining, -200.5)
    assert.equal(summary.perDayRemaining, 0)
  })
})

describe("WeatherService", () => {
  test("TC-UNIT-04 maps WMO weather codes to conditions", () => {
    assert.deepEqual(describeWeather(0), { condition: "Clear sky", icon: "sun" })
    assert.equal(describeWeather(63).icon, "rain")
    assert.equal(describeWeather(95).condition, "Thunderstorm")
    assert.equal(describeWeather(1234).condition, "Unknown")
  })

  test("TC-UNIT-05 suggests travel advice from conditions", () => {
    const mild = { code: 1, temperature: 24, windSpeed: 10 }
    assert.equal(travelSuggestion(mild, { precipitationChance: 5 }).level, "good")
    assert.equal(travelSuggestion(mild, { precipitationChance: 80 }).title, "Pack an umbrella")
    assert.equal(travelSuggestion({ ...mild, code: 95 }, {}).level, "alert")
    assert.equal(travelSuggestion({ ...mild, temperature: 38 }, {}).title, "Very hot — plan for shade")
    assert.equal(travelSuggestion({ ...mild, windSpeed: 55 }, {}).title, "Windy conditions")
  })

  test("TC-UNIT-06 offline forecast is deterministic and complete", () => {
    const now = new Date(2030, 0, 15)
    const a = simulatedForecast({ lat: 23.8, lng: 90.4 }, now)
    const b = simulatedForecast({ lat: 23.8, lng: 90.4 }, now)
    assert.deepEqual(a, b)
    assert.equal(a.daily.length, 7)
    assert.ok(a.daily.every((day) => day.high > day.low))
  })
})

describe("Geo and routing helpers", () => {
  test("TC-UNIT-07 calculates great-circle distance", () => {
    const dhaka = { lat: 23.8103, lng: 90.4125 }
    const chattogram = { lat: 22.3569, lng: 91.7832 }
    assert.ok(Math.abs(haversineKm(dhaka, chattogram) - 213) < 5)
    assert.equal(haversineKm(dhaka, dhaka), 0)
  })

  test("TC-UNIT-08 parses coordinates and rejects invalid ones", () => {
    assert.deepEqual(parseCoordinate("23.8,90.4"), { lat: 23.8, lng: 90.4 })
    assert.deepEqual(parseCoordinate("1", "2"), { lat: 1, lng: 2 })
    assert.throws(() => parseCoordinate("91", "0"), /valid location/)
    assert.throws(() => parseCoordinate(undefined, undefined), /valid location/)
  })

  test("TC-UNIT-09 estimates routes and formats durations", () => {
    const route = estimateRoute({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, "walk")
    assert.ok(route.distanceKm > 111)
    assert.equal(route.source, "estimate")
    assert.equal(formatDuration(78), "1 hr 18 min")
    assert.equal(formatDuration(45), "45 min")
    assert.equal(formatDuration(120), "2 hr")
  })
})

describe("Request validation", () => {
  const schema = {
    name: { type: "string", required: true, min: 2 },
    age: { type: "integer", min: 0 },
    when: { type: "date" },
    kind: { type: "enum", values: ["a", "b"], default: "a" },
  }

  test("TC-UNIT-10 cleans valid input and applies defaults", () => {
    assert.deepEqual(validate({ name: "  Mahima ", age: "21", extra: "ignored" }, schema), { name: "Mahima", age: 21, kind: "a" })
  })

  test("TC-UNIT-11 reports every invalid field", () => {
    assert.throws(
      () => validate({ name: "", age: 2.5, when: "2030-13-45", kind: "c" }, schema),
      (error) => error.status === 400 && Object.keys(error.details).length === 4,
    )
  })

  test("TC-UNIT-12 partial validation only checks provided fields", () => {
    assert.deepEqual(validate({ age: 5 }, schema, { partial: true }), { age: 5 })
    assert.throws(() => validate({ name: "" }, schema, { partial: true }), /highlighted/)
  })
})
