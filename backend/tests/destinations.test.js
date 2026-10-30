import assert from "node:assert/strict"
import { before, describe, test } from "node:test"
import { DEMO_ACCOUNTS, login, setup } from "./helpers.js"

const newDestination = {
  name: "Ratargul Swamp Forest",
  location: "Sylhet, Bangladesh",
  country: "Bangladesh",
  region: "Asia",
  category: "Nature",
  tag: "Swamp forest",
  description: "A freshwater swamp forest where boats glide between trees standing in clear water during the monsoon.",
  imageUrl: "https://example.com/ratargul.jpg",
  latitude: 25.0,
  longitude: 91.93,
  avgCost: 120,
}

describe("Destination exploration API", () => {
  let api
  before(async () => ({ api } = await setup()))

  test("TC-DEST-01 lists destinations with ratings and pagination info", async () => {
    const res = await api.get("/api/destinations?limit=5")
    assert.equal(res.status, 200)
    assert.equal(res.body.total, 16)
    assert.equal(res.body.items.length, 5)
    assert.equal(res.body.pages, 4)
    for (const item of res.body.items) {
      assert.ok(item.rating > 0 && item.reviewCount > 0)
      assert.ok(Array.isArray(item.gallery))
    }
  })

  test("TC-DEST-02 searches by name, location or tag", async () => {
    const res = await api.get("/api/destinations?q=sylhet")
    assert.deepEqual(res.body.items.map((d) => d.name).sort(), ["Jaflong", "Srimangal Tea Gardens"])
  })

  test("TC-DEST-03 filters by category, region, budget and minimum rating", async () => {
    const beaches = await api.get("/api/destinations?category=beach&region=Asia")
    assert.ok(beaches.body.items.every((d) => d.category === "Beach" && d.region === "Asia"))
    assert.equal(beaches.body.total, 3)

    const premium = await api.get("/api/destinations?budget=high")
    assert.ok(premium.body.items.every((d) => d.avgCost >= 1500))

    const topRated = await api.get("/api/destinations?minRating=4.8")
    assert.ok(topRated.body.items.length > 0)
    assert.ok(topRated.body.items.every((d) => d.rating >= 4.8))
  })

  test("TC-DEST-04 sorts results and rejects unknown sort options", async () => {
    const res = await api.get("/api/destinations?sort=price_low&limit=50")
    const costs = res.body.items.map((d) => d.avgCost)
    assert.deepEqual(costs, [...costs].sort((a, b) => a - b))
    assert.equal((await api.get("/api/destinations?sort=random")).status, 400)
  })

  test("TC-DEST-05 shows destination details by slug or id", async () => {
    const bySlug = await api.get("/api/destinations/sajek-valley")
    assert.equal(bySlug.status, 200)
    assert.equal(bySlug.body.destination.name, "Sajek Valley")
    assert.ok(bySlug.body.destination.localTip)

    const byId = await api.get(`/api/destinations/${bySlug.body.destination.id}`)
    assert.equal(byId.body.destination.slug, "sajek-valley")
    assert.equal((await api.get("/api/destinations/atlantis")).status, 404)
  })

  test("TC-DEST-06 only admins can create destinations", async () => {
    assert.equal((await api.post("/api/destinations").send(newDestination)).status, 401)
    const traveler = await login(api)
    assert.equal((await api.post("/api/destinations").set(traveler.auth).send(newDestination)).status, 403)

    const admin = await login(api, DEMO_ACCOUNTS.admin)
    const res = await api.post("/api/destinations").set(admin.auth).send(newDestination)
    assert.equal(res.status, 201)
    assert.equal(res.body.destination.slug, "ratargul-swamp-forest")
    assert.equal(res.body.destination.rating, 0)
  })

  test("TC-DEST-07 validates destination data", async () => {
    const admin = await login(api, DEMO_ACCOUNTS.admin)
    const res = await api
      .post("/api/destinations")
      .set(admin.auth)
      .send({ ...newDestination, category: "Desert", latitude: 120, imageUrl: "ftp://x" })
    assert.equal(res.status, 400)
    assert.deepEqual(Object.keys(res.body.error.details).sort(), ["category", "imageUrl", "latitude"])
  })

  test("TC-DEST-08 admins can update and delete destinations", async () => {
    const admin = await login(api, DEMO_ACCOUNTS.admin)
    const traveler = await login(api)
    const { body } = await api.get("/api/destinations/coxs-bazar-sea-beach")
    const id = body.destination.id

    const updated = await api.put(`/api/destinations/${id}`).set(admin.auth).send({ bestTime: "December – February" })
    assert.equal(updated.status, 200)
    assert.equal(updated.body.destination.bestTime, "December – February")
    assert.equal(updated.body.destination.name, "Cox's Bazar Sea Beach")

    assert.equal((await api.delete(`/api/destinations/${id}`).set(admin.auth)).status, 204)
    assert.equal((await api.get(`/api/destinations/${id}`)).status, 404)
    const favorites = await api.get("/api/favorites").set(traveler.auth)
    assert.ok(!favorites.body.destinations.some((d) => d.id === id), "deleted destination is removed from favorites")
  })
})
