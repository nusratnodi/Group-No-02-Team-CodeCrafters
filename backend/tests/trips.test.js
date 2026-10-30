import assert from "node:assert/strict"
import { before, describe, test } from "node:test"
import { login, registerAndLogin, setup } from "./helpers.js"

describe("Expense tracker API (trips and expenses)", () => {
  let api
  let auth
  let tripId
  before(async () => {
    ;({ api } = await setup())
    ;({ auth } = await registerAndLogin(api))
  })

  test("TC-TRIP-01 creates a trip budget", async () => {
    const res = await api
      .post("/api/trips")
      .set(auth)
      .send({ name: "Sajek Weekend", startDate: "2030-01-10", endDate: "2030-01-14", budget: 20000, currency: "BDT" })
    assert.equal(res.status, 201)
    tripId = res.body.trip.id
    assert.equal(res.body.trip.summary.days, 5)
    assert.equal(res.body.trip.summary.totalSpent, 0)
    assert.equal(res.body.trip.summary.remaining, 20000)
  })

  test("TC-TRIP-02 rejects an end date before the start date and invalid budgets", async () => {
    const res = await api
      .post("/api/trips")
      .set(auth)
      .send({ name: "Backwards", startDate: "2030-02-10", endDate: "2030-02-01", budget: 100 })
    assert.equal(res.status, 400)
    assert.ok(res.body.error.details.endDate)

    const negative = await api
      .post("/api/trips")
      .set(auth)
      .send({ name: "Negative", startDate: "2030-02-01", endDate: "2030-02-02", budget: -5 })
    assert.equal(negative.status, 400)
  })

  test("TC-EXP-01 records categorized expenses and updates the summary", async () => {
    const expenses = [
      { title: "Jeep from Khagrachari", category: "Transportation", amount: 3000, spentOn: "2030-01-10" },
      { title: "Cottage stay", category: "Accommodation", amount: 9000, spentOn: "2030-01-10" },
      { title: "Bamboo chicken dinner", category: "Food", amount: 1200, spentOn: "2030-01-11" },
    ]
    for (const expense of expenses) {
      const res = await api.post(`/api/trips/${tripId}/expenses`).set(auth).send(expense)
      assert.equal(res.status, 201)
    }

    const res = await api.get(`/api/trips/${tripId}`).set(auth)
    assert.equal(res.status, 200)
    assert.equal(res.body.expenses.length, 3)
    assert.equal(res.body.summary.totalSpent, 13200)
    assert.equal(res.body.summary.remaining, 6800)
    assert.equal(res.body.summary.percentUsed, 66)
    assert.equal(res.body.summary.status, "on-track")
    assert.deepEqual(
      res.body.summary.byCategory.map((c) => c.category),
      ["Accommodation", "Transportation", "Food"],
    )
  })

  test("TC-EXP-02 validates expense amount, category and date", async () => {
    const res = await api
      .post(`/api/trips/${tripId}/expenses`)
      .set(auth)
      .send({ title: "Mystery", category: "Gifts", amount: 0, spentOn: "10/01/2030" })
    assert.equal(res.status, 400)
    assert.deepEqual(Object.keys(res.body.error.details).sort(), ["amount", "category", "spentOn"])
  })

  test("TC-EXP-03 filters expenses by category", async () => {
    const res = await api.get(`/api/trips/${tripId}/expenses?category=Food`).set(auth)
    assert.equal(res.status, 200)
    assert.deepEqual(res.body.items.map((e) => e.title), ["Bamboo chicken dinner"])
  })

  test("TC-EXP-04 edits and deletes an expense", async () => {
    const { body } = await api.get(`/api/trips/${tripId}/expenses?category=Food`).set(auth)
    const id = body.items[0].id

    const edited = await api.put(`/api/expenses/${id}`).set(auth).send({ amount: 10000 })
    assert.equal(edited.status, 200)
    assert.equal(edited.body.expense.amount, 10000)
    assert.equal(edited.body.expense.title, "Bamboo chicken dinner")

    const over = await api.get(`/api/trips/${tripId}`).set(auth)
    assert.equal(over.body.summary.status, "over")
    assert.equal(over.body.summary.remaining, -2000)

    assert.equal((await api.delete(`/api/expenses/${id}`).set(auth)).status, 204)
    const after = await api.get(`/api/trips/${tripId}`).set(auth)
    assert.equal(after.body.summary.totalSpent, 12000)
    assert.equal(after.body.summary.status, "on-track")
  })

  test("TC-TRIP-03 updates the trip budget", async () => {
    const res = await api.put(`/api/trips/${tripId}`).set(auth).send({ budget: 30000 })
    assert.equal(res.status, 200)
    assert.equal(res.body.trip.budget, 30000)
    assert.equal(res.body.trip.summary.percentUsed, 40)
  })

  test("TC-TRIP-04 keeps each traveler's trips private", async () => {
    const other = await login(api)
    assert.equal((await api.get(`/api/trips/${tripId}`).set(other.auth)).status, 404)
    const list = await api.get("/api/trips").set(other.auth)
    assert.ok(!list.body.items.some((t) => t.id === tripId))
    const { body } = await api.get(`/api/trips/${tripId}/expenses`).set(auth)
    assert.equal((await api.delete(`/api/expenses/${body.items[0].id}`).set(other.auth)).status, 404)
  })

  test("TC-TRIP-05 deleting a trip deletes its expenses", async () => {
    const { body } = await api.get(`/api/trips/${tripId}/expenses`).set(auth)
    assert.equal((await api.delete(`/api/trips/${tripId}`).set(auth)).status, 204)
    assert.equal((await api.get(`/api/trips/${tripId}`).set(auth)).status, 404)
    assert.equal((await api.put(`/api/expenses/${body.items[0].id}`).set(auth).send({ amount: 1 })).status, 404)
  })

  test("TC-TRIP-06 lists trips with their budget summaries", async () => {
    const demo = await login(api)
    const res = await api.get("/api/trips").set(demo.auth)
    assert.equal(res.status, 200)
    assert.equal(res.body.items.length, 3)
    const coxs = res.body.items.find((t) => t.name === "Cox's Bazar Getaway")
    assert.equal(coxs.currency, "BDT")
    assert.equal(coxs.summary.totalSpent, 21800)
    assert.equal(coxs.destinationSlug, "coxs-bazar-sea-beach")
  })
})
