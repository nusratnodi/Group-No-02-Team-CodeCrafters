import assert from "node:assert/strict"
import { before, describe, test } from "node:test"
import { DEMO_ACCOUNTS, login, setup } from "./helpers.js"

describe("Authentication API", () => {
  let api
  before(async () => ({ api } = await setup()))

  test("TC-AUTH-01 registers a new traveler and returns a token", async () => {
    const res = await api
      .post("/api/auth/register")
      .send({ name: "Nusrat Nodi", email: "nodi@example.com", password: "Travel2026" })
    assert.equal(res.status, 201)
    assert.ok(res.body.token)
    assert.equal(res.body.user.email, "nodi@example.com")
    assert.equal(res.body.user.role, "user")
    assert.equal(res.body.user.password_hash, undefined, "password hash must never be returned")
  })

  test("TC-AUTH-02 rejects registration with an email that is already used", async () => {
    const res = await api
      .post("/api/auth/register")
      .send({ name: "Someone", email: "DEMO@tripza.com", password: "Travel2026" })
    assert.equal(res.status, 409)
    assert.match(res.body.error.details.email, /already registered/)
  })

  test("TC-AUTH-03 validates name, email and password strength", async () => {
    const res = await api.post("/api/auth/register").send({ name: "A", email: "not-an-email", password: "password" })
    assert.equal(res.status, 400)
    assert.deepEqual(Object.keys(res.body.error.details).sort(), ["email", "name", "password"])
    assert.match(res.body.error.details.password, /letter and one number/)
  })

  test("TC-AUTH-04 logs in with valid credentials", async () => {
    const res = await api.post("/api/auth/login").send({ email: "demo@tripza.com", password: DEMO_ACCOUNTS.traveler.password })
    assert.equal(res.status, 200)
    assert.ok(res.body.token)
    assert.equal(res.body.user.name, "Alex Johnson")
  })

  test("TC-AUTH-05 rejects a wrong password with a generic message", async () => {
    const res = await api.post("/api/auth/login").send({ email: "demo@tripza.com", password: "WrongPass1" })
    assert.equal(res.status, 401)
    assert.equal(res.body.error.message, "Invalid email or password")
  })

  test("TC-AUTH-06 returns the current user for a valid token", async () => {
    const { auth } = await login(api)
    const res = await api.get("/api/auth/me").set(auth)
    assert.equal(res.status, 200)
    assert.equal(res.body.user.email, "demo@tripza.com")
  })

  test("TC-AUTH-07 rejects missing or invalid tokens on protected routes", async () => {
    assert.equal((await api.get("/api/auth/me")).status, 401)
    const res = await api.get("/api/auth/me").set("Authorization", "Bearer not-a-real-token")
    assert.equal(res.status, 401)
    assert.match(res.body.error.message, /session has expired/)
  })
})

describe("User profile API", () => {
  let api
  before(async () => ({ api } = await setup()))

  test("TC-USER-01 shows the profile with trip, favorite and review counts", async () => {
    const { auth } = await login(api)
    const res = await api.get("/api/users/me").set(auth)
    assert.equal(res.status, 200)
    assert.deepEqual(res.body.stats, { trips: 3, favorites: 5, reviews: 2 })
  })

  test("TC-USER-02 updates name, location and bio", async () => {
    const { auth } = await login(api)
    const res = await api.put("/api/users/me").set(auth).send({ name: "Alex J.", location: "Sylhet, Bangladesh", bio: "" })
    assert.equal(res.status, 200)
    assert.equal(res.body.user.name, "Alex J.")
    assert.equal(res.body.user.location, "Sylhet, Bangladesh")
    assert.equal(res.body.user.bio, null)
  })

  test("TC-USER-03 changes the password only when the current password is correct", async () => {
    const { auth } = await login(api)
    const wrong = await api.put("/api/users/me/password").set(auth).send({ currentPassword: "nope1234", newPassword: "NewPass2026" })
    assert.equal(wrong.status, 401)

    const ok = await api
      .put("/api/users/me/password")
      .set(auth)
      .send({ currentPassword: DEMO_ACCOUNTS.traveler.password, newPassword: "NewPass2026" })
    assert.equal(ok.status, 200)
    const relogin = await api.post("/api/auth/login").send({ email: "demo@tripza.com", password: "NewPass2026" })
    assert.equal(relogin.status, 200)
  })
})
