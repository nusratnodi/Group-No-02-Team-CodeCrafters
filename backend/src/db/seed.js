import { pathToFileURL } from "node:url"
import bcrypt from "bcryptjs"
import { config } from "../config.js"
import { createModels } from "../models/index.js"
import { applySchema, connectDatabase, dropSchema, waitForDatabase } from "./database.js"
import * as data from "./seedData.js"

export const DEMO_ACCOUNTS = {
  admin: { name: "Tripza Admin", email: "admin@tripza.com", password: "Admin@1234" },
  traveler: { name: "Alex Johnson", email: "demo@tripza.com", password: "Demo@1234" },
  sampleTravelerPassword: "Traveler@123",
}

const isoDate = (date) => date.toISOString().slice(0, 10)
const shiftDays = (date, days) => new Date(date.getTime() + days * 86400000)

/** Fills an empty database with sample destinations, places, users, reviews, favorites and trips. */
export async function seedDatabase(database, { bcryptRounds = config.bcryptRounds, now = new Date() } = {}) {
  const [adminHash, demoHash, travelerHash] = await Promise.all([
    bcrypt.hash(DEMO_ACCOUNTS.admin.password, bcryptRounds),
    bcrypt.hash(DEMO_ACCOUNTS.traveler.password, bcryptRounds),
    bcrypt.hash(DEMO_ACCOUNTS.sampleTravelerPassword, bcryptRounds),
  ])

  return database.transaction(async (db) => {
    const models = createModels(db)

    await models.users.create({ ...DEMO_ACCOUNTS.admin, passwordHash: adminHash, role: "admin", location: "Dhaka, Bangladesh" })
    const demoUser = await models.users.create({
      ...DEMO_ACCOUNTS.traveler,
      passwordHash: demoHash,
      location: "Dhaka, Bangladesh",
      bio: "Weekend explorer, beach lover and street-food hunter.",
    })
    const travelers = {}
    for (const { key, ...traveler } of data.travelers) {
      travelers[key] = await models.users.create({ ...traveler, passwordHash: travelerHash })
    }

    // Stagger creation times so "newest" sorting is meaningful.
    const destinations = {}
    for (const [index, { key, ...destination }] of data.destinations.entries()) {
      destinations[key] = await models.destinations.create({ ...destination, createdAt: shiftDays(now, -index) })
    }

    const places = {}
    for (const [key, list] of Object.entries(data.places)) {
      const destination = destinations[key]
      for (const [name, category, type, dLat, dLng, rating] of list) {
        places[`${key}:${name}`] = await models.places.create({
          destinationId: destination.id,
          name,
          category,
          type,
          address: destination.location,
          latitude: Math.round((destination.latitude + dLat) * 1e6) / 1e6,
          longitude: Math.round((destination.longitude + dLng) * 1e6) / 1e6,
          rating,
        })
      }
    }

    for (const [travelerKey, destinationKey, rating, comment, daysAgo] of data.reviews) {
      await models.reviews.create({
        userId: travelers[travelerKey].id,
        destinationId: destinations[destinationKey].id,
        rating,
        comment,
        createdAt: shiftDays(now, -daysAgo),
      })
    }
    for (const [destinationKey, rating, comment, daysAgo] of data.demo.reviews) {
      await models.reviews.create({
        userId: demoUser.id,
        destinationId: destinations[destinationKey].id,
        rating,
        comment,
        createdAt: shiftDays(now, -daysAgo),
      })
    }

    for (const key of data.demo.favoriteDestinations) {
      await models.favorites.add(demoUser.id, "destination", destinations[key].id)
    }
    for (const [key, name] of data.demo.favoritePlaces) {
      await models.favorites.add(demoUser.id, "place", places[`${key}:${name}`].id)
    }

    for (const trip of data.demo.trips) {
      const start = shiftDays(now, trip.startIn)
      const created = await models.trips.create({
        userId: demoUser.id,
        destinationId: destinations[trip.destination].id,
        name: trip.name,
        startDate: isoDate(start),
        endDate: isoDate(shiftDays(start, trip.days - 1)),
        budget: trip.budget,
        currency: trip.currency,
      })
      for (const [title, category, amount, dayOffset] of trip.expenses) {
        await models.expenses.create({ tripId: created.id, title, category, amount, spentOn: isoDate(shiftDays(now, dayOffset)) })
      }
    }

    return {
      users: await models.users.count(),
      destinations: await models.destinations.count(),
      places: Object.keys(places).length,
      reviews: await models.reviews.count(),
      trips: await models.trips.count(),
    }
  })
}

/** True when the database has no destinations yet (fresh install). */
export async function isEmpty(db) {
  return (await db.get("SELECT COUNT(*) AS count FROM destinations")).count === 0
}

// `npm run seed` — drop the Tripza tables, recreate them and load the sample data.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = connectDatabase(config.databaseUrl)
  try {
    await waitForDatabase(db)
    if (process.argv.includes("--reset")) await dropSchema(db)
    await applySchema(db)
    if (!(await isEmpty(db))) {
      console.log("Database already has data. Run with --reset to recreate it.")
    } else {
      const summary = await seedDatabase(db)
      console.log("Seeded database:", summary)
      console.log(`Admin login:    ${DEMO_ACCOUNTS.admin.email} / ${DEMO_ACCOUNTS.admin.password}`)
      console.log(`Traveler login: ${DEMO_ACCOUNTS.traveler.email} / ${DEMO_ACCOUNTS.traveler.password}`)
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  } finally {
    await db.close()
  }
}
