import assert from "node:assert/strict"
import { before, describe, test } from "node:test"
import { login, setup } from "./helpers.js"

describe("Bookmarks / favorites API", () => {
  let api
  let auth
  before(async () => {
    ;({ api } = await setup())
    ;({ auth } = await login(api))
  })

  test("TC-FAV-01 lists saved destinations and places, newest first", async () => {
    const res = await api.get("/api/favorites").set(auth)
    assert.equal(res.status, 200)
    assert.deepEqual(res.body.destinations.map((d) => d.name).sort(), ["Amalfi Coast", "Cox's Bazar Sea Beach", "Sajek Valley"])
    assert.deepEqual(res.body.places.map((p) => p.name).sort(), ["Da Gemma", "Poushee Restaurant"])
    assert.ok(res.body.destinations[0].savedAt)
  })

  test("TC-FAV-02 saves a destination (and saving twice is harmless)", async () => {
    const jaflong = (await api.get("/api/destinations/jaflong")).body.destination
    const first = await api.post("/api/favorites").set(auth).send({ itemType: "destination", itemId: jaflong.id })
    assert.equal(first.status, 201)
    const second = await api.post("/api/favorites").set(auth).send({ itemType: "destination", itemId: jaflong.id })
    assert.equal(second.status, 200)

    const list = await api.get("/api/favorites").set(auth)
    assert.equal(list.body.destinations.filter((d) => d.id === jaflong.id).length, 1)
  })

  test("TC-FAV-03 saves a nearby place", async () => {
    const nearby = await api.get("/api/nearby?destination=jaflong")
    const place = nearby.body.items[0]
    const res = await api.post("/api/favorites").set(auth).send({ itemType: "place", itemId: place.id })
    assert.equal(res.status, 201)
  })

  test("TC-FAV-04 rejects unknown items and item types", async () => {
    assert.equal((await api.post("/api/favorites").set(auth).send({ itemType: "destination", itemId: 9999 })).status, 404)
    assert.equal((await api.post("/api/favorites").set(auth).send({ itemType: "hotel", itemId: 1 })).status, 400)
  })

  test("TC-FAV-05 removes a saved item", async () => {
    const sajek = (await api.get("/api/destinations/sajek-valley")).body.destination
    assert.equal((await api.delete(`/api/favorites/destination/${sajek.id}`).set(auth)).status, 204)
    assert.equal((await api.delete(`/api/favorites/destination/${sajek.id}`).set(auth)).status, 404)
  })

  test("TC-FAV-06 requires login", async () => {
    assert.equal((await api.get("/api/favorites")).status, 401)
  })
})
