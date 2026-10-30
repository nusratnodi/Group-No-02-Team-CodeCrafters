import assert from "node:assert/strict"
import { before, describe, test } from "node:test"
import { DEMO_ACCOUNTS, login, registerAndLogin, setup } from "./helpers.js"

describe("Reviews and feedback API", () => {
  let api
  let sajekId
  before(async () => {
    ;({ api } = await setup())
    sajekId = (await api.get("/api/destinations/sajek-valley")).body.destination.id
  })

  test("TC-REV-01 lists reviews for a destination with a rating summary", async () => {
    const res = await api.get("/api/reviews?destination=amalfi-coast")
    assert.equal(res.status, 200)
    assert.equal(res.body.summary.count, 4)
    assert.equal(res.body.summary.average, 4.8)
    assert.deepEqual(res.body.summary.distribution, { 1: 0, 2: 0, 3: 0, 4: 25, 5: 75 })
    assert.ok(res.body.items[0].userName)
  })

  test("TC-REV-02 a logged-in traveler can post a review and the rating updates", async () => {
    const { auth } = await registerAndLogin(api)
    const res = await api
      .post("/api/reviews")
      .set(auth)
      .send({ destinationId: sajekId, rating: 1, comment: "Too foggy to see anything on our visit." })
    assert.equal(res.status, 201)
    assert.equal(res.body.review.rating, 1)

    const destination = (await api.get("/api/destinations/sajek-valley")).body.destination
    assert.equal(destination.reviewCount, 4)
    assert.equal(destination.rating, 3.8) // (5 + 5 + 4 + 1) / 4 = 3.75
  })

  test("TC-REV-03 guests cannot post reviews", async () => {
    const res = await api.post("/api/reviews").send({ destinationId: sajekId, rating: 5, comment: "Lovely place to visit!" })
    assert.equal(res.status, 401)
  })

  test("TC-REV-04 validates rating range and comment length", async () => {
    const { auth } = await registerAndLogin(api)
    const res = await api.post("/api/reviews").set(auth).send({ destinationId: sajekId, rating: 6, comment: "Short" })
    assert.equal(res.status, 400)
    assert.ok(res.body.error.details.rating)
    assert.ok(res.body.error.details.comment)
  })

  test("TC-REV-05 allows only one review per destination per user", async () => {
    const { auth } = await login(api)
    const coxs = (await api.get("/api/destinations/coxs-bazar-sea-beach")).body.destination
    const res = await api.post("/api/reviews").set(auth).send({ destinationId: coxs.id, rating: 4, comment: "Visited again this year." })
    assert.equal(res.status, 409)
  })

  test("TC-REV-06 authors can edit and delete their own reviews only", async () => {
    const owner = await registerAndLogin(api)
    const other = await registerAndLogin(api)
    const created = await api
      .post("/api/reviews")
      .set(owner.auth)
      .send({ destinationId: sajekId, rating: 3, comment: "Good view but the road was rough." })
    const id = created.body.review.id

    assert.equal((await api.put(`/api/reviews/${id}`).set(other.auth).send({ rating: 1 })).status, 403)
    const edited = await api.put(`/api/reviews/${id}`).set(owner.auth).send({ rating: 4 })
    assert.equal(edited.status, 200)
    assert.equal(edited.body.review.rating, 4)
    assert.equal(edited.body.review.comment, "Good view but the road was rough.")

    assert.equal((await api.delete(`/api/reviews/${id}`).set(other.auth)).status, 403)
    assert.equal((await api.delete(`/api/reviews/${id}`).set(owner.auth)).status, 204)
    assert.equal((await api.put(`/api/reviews/${id}`).set(owner.auth).send({ rating: 2 })).status, 404)
  })

  test("TC-REV-07 admins can remove inappropriate reviews", async () => {
    const author = await registerAndLogin(api)
    const admin = await login(api, DEMO_ACCOUNTS.admin)
    const created = await api
      .post("/api/reviews")
      .set(author.auth)
      .send({ destinationId: sajekId, rating: 1, comment: "Spam spam spam spam spam" })
    assert.equal((await api.delete(`/api/reviews/${created.body.review.id}`).set(admin.auth)).status, 204)
  })

  test("TC-REV-08 lists the current user's own reviews", async () => {
    const { auth } = await login(api)
    const res = await api.get("/api/reviews?mine=true").set(auth)
    assert.equal(res.status, 200)
    assert.equal(res.body.total, 2)
    assert.ok(res.body.items.every((r) => r.userName === "Alex Johnson"))
    assert.equal((await api.get("/api/reviews?mine=true")).status, 401)
  })
})
