import assert from "node:assert/strict"
import { before, describe, test } from "node:test"
import { setup } from "./helpers.js"

describe("Nearby places API", () => {
  let api
  before(async () => ({ api } = await setup()))

  test("TC-NEAR-01 finds places around a destination, nearest first", async () => {
    const res = await api.get("/api/nearby?destination=coxs-bazar-sea-beach")
    assert.equal(res.status, 200)
    assert.equal(res.body.center.name, "Cox's Bazar Sea Beach")
    assert.equal(res.body.source, "tripza")
    const distances = res.body.items.map((p) => p.distanceKm)
    assert.ok(distances.length >= 10)
    assert.deepEqual(distances, [...distances].sort((a, b) => a - b))
  })

  test("TC-NEAR-02 filters by category (restaurants, hospitals, hotels, shopping, ATMs, others)", async () => {
    for (const category of ["restaurant", "hospital", "hotel", "shopping", "atm", "other"]) {
      const res = await api.get(`/api/nearby?destination=coxs-bazar-sea-beach&category=${category}`)
      assert.ok(res.body.items.length > 0, `expected ${category} results`)
      assert.ok(res.body.items.every((p) => p.category === category))
    }
  })

  test("TC-NEAR-03 sorts by rating and respects the search radius", async () => {
    const byRating = await api.get("/api/nearby?destination=coxs-bazar-sea-beach&sort=rating")
    const ratings = byRating.body.items.map((p) => p.rating)
    assert.deepEqual(ratings, [...ratings].sort((a, b) => b - a))

    const close = await api.get("/api/nearby?destination=coxs-bazar-sea-beach&radius=1")
    assert.ok(close.body.items.every((p) => p.distanceKm <= 1))
    assert.ok(close.body.items.length < byRating.body.items.length)
  })

  test("TC-NEAR-04 works with the traveler's own coordinates", async () => {
    const res = await api.get("/api/nearby?lat=23.7190&lng=90.3882&category=restaurant")
    assert.equal(res.status, 200)
    assert.ok(res.body.items.some((p) => p.name === "Haji Biriyani"))
  })

  test("TC-NEAR-05 validates location and category", async () => {
    assert.equal((await api.get("/api/nearby")).status, 400)
    assert.equal((await api.get("/api/nearby?lat=200&lng=10")).status, 400)
    assert.equal((await api.get("/api/nearby?destination=jaflong&category=casino")).status, 400)
    assert.equal((await api.get("/api/nearby?destination=nowhere")).status, 404)
  })

  test("TC-NEAR-06 returns details for a single place", async () => {
    const { body } = await api.get("/api/nearby?destination=amalfi-coast&category=restaurant")
    const res = await api.get(`/api/places/${body.items[0].id}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.place.name, "Da Gemma")
    assert.equal(res.body.place.destinationName, "Amalfi Coast")
  })
})

describe("Weather API", () => {
  let api
  before(async () => ({ api } = await setup()))

  test("TC-WEA-01 returns current conditions, a 7-day forecast and a travel suggestion", async () => {
    const res = await api.get("/api/weather?destination=sajek-valley")
    assert.equal(res.status, 200)
    assert.equal(res.body.location.name, "Sajek Valley")
    assert.equal(res.body.daily.length, 7)
    assert.equal(typeof res.body.current.temperature, "number")
    assert.ok(res.body.current.condition)
    assert.ok(["good", "caution", "alert"].includes(res.body.suggestion.level))
    assert.equal(res.body.source, "simulated", "offline mode uses the built-in estimate")
  })

  test("TC-WEA-02 accepts coordinates for the traveler's current location", async () => {
    const res = await api.get("/api/weather?lat=23.81&lng=90.41&name=Dhaka")
    assert.equal(res.status, 200)
    assert.equal(res.body.location.name, "Dhaka")
    assert.equal(res.body.location.destination, null)
  })

  test("TC-WEA-03 rejects requests without a valid location", async () => {
    assert.equal((await api.get("/api/weather")).status, 400)
    assert.equal((await api.get("/api/weather?lat=abc&lng=1")).status, 400)
  })
})

describe("Location & navigation API", () => {
  let api
  before(async () => ({ api } = await setup()))

  test("TC-NAV-01 plans a route to a destination with distance, duration and path", async () => {
    const res = await api.get("/api/navigation/route?from=23.8103,90.4125&destination=coxs-bazar-sea-beach&mode=car")
    assert.equal(res.status, 200)
    const { route } = res.body
    assert.ok(route.distanceKm > 280, "road distance is longer than the straight line")
    assert.ok(route.durationMin > 0)
    assert.match(route.durationText, /hr/)
    assert.ok(route.geometry.length >= 2)
    assert.match(route.navigationUrl, /^https:\/\/www\.google\.com\/maps\/dir\//)
  })

  test("TC-NAV-02 travel time depends on the mode (car, bus, walk)", async () => {
    const time = async (mode) =>
      (await api.get(`/api/navigation/route?from=23.8103,90.4125&to=23.7190,90.3882&mode=${mode}`)).body.route.durationMin
    const [car, bus, walk] = [await time("car"), await time("bus"), await time("walk")]
    assert.ok(car < bus && bus < walk)
  })

  test("TC-NAV-03 validates route parameters", async () => {
    assert.equal((await api.get("/api/navigation/route?destination=jaflong")).status, 400)
    assert.equal((await api.get("/api/navigation/route?from=23.8,90.4&destination=jaflong&mode=plane")).status, 400)
    assert.equal((await api.get("/api/navigation/route?from=23.8,90.4")).status, 400)
  })

  test("TC-NAV-04 searches places by name for the starting point", async () => {
    const res = await api.get("/api/navigation/geocode?q=Lalbagh")
    assert.equal(res.status, 200)
    assert.equal(res.body.results[0].name, "Lalbagh Fort")
    assert.equal(res.body.results[0].type, "destination")
    assert.equal((await api.get("/api/navigation/geocode?q=a")).status, 400)
  })
})
