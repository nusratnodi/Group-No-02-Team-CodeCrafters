import assert from "node:assert/strict"
import { before, describe, test } from "node:test"
import { DEMO_ACCOUNTS, login, setup } from "./helpers.js"

describe("System, newsletter and admin API", () => {
  let api
  before(async () => ({ api } = await setup()))

  test("TC-SYS-01 health check reports the API and database are running", async () => {
    const res = await api.get("/api/health")
    assert.equal(res.status, 200)
    assert.equal(res.body.status, "ok")
    assert.equal(res.body.database, "ok")
  })

  test("TC-SYS-02 newsletter sign-up accepts new emails once", async () => {
    assert.equal((await api.post("/api/newsletter").send({ email: "fan@example.com" })).status, 201)
    assert.equal((await api.post("/api/newsletter").send({ email: "FAN@example.com" })).status, 200)
    assert.equal((await api.post("/api/newsletter").send({ email: "nope" })).status, 400)
  })

  test("TC-SYS-03 admin statistics are restricted to admins", async () => {
    const traveler = await login(api)
    assert.equal((await api.get("/api/admin/stats").set(traveler.auth)).status, 403)
    const admin = await login(api, DEMO_ACCOUNTS.admin)
    const res = await api.get("/api/admin/stats").set(admin.auth)
    assert.equal(res.status, 200)
    assert.equal(res.body.destinations, 16)
    assert.equal(res.body.users, 8)
  })

  test("TC-SYS-04 returns JSON errors for unknown routes and malformed JSON", async () => {
    const missing = await api.get("/api/does-not-exist")
    assert.equal(missing.status, 404)
    assert.match(missing.body.error.message, /Route not found/)

    const malformed = await api.post("/api/auth/login").set("Content-Type", "application/json").send("{bad json")
    assert.equal(malformed.status, 400)
    assert.equal(malformed.body.error.message, "Request body is not valid JSON")
  })

  test("TC-SYS-05 sets security headers", async () => {
    const res = await api.get("/api/health")
    assert.equal(res.headers["x-content-type-options"], "nosniff")
    assert.equal(res.headers["x-powered-by"], undefined)
  })
})
