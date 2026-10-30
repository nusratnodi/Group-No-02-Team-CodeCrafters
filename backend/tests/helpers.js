import { after } from "node:test"
import pg from "pg"
import supertest from "supertest"
import { createApp } from "../src/app.js"
import { config } from "../src/config.js"
import { applySchema, connectDatabase } from "../src/db/database.js"
import { DEMO_ACCOUNTS, seedDatabase } from "../src/db/seed.js"

export { DEMO_ACCOUNTS }

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || config.databaseUrl
const opened = []

/** Runs one statement on a short-lived connection (used to create and drop test schemas). */
async function adminQuery(sql) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL })
  try {
    await client.connect()
  } catch (error) {
    throw new Error(
      `The API tests need PostgreSQL at ${new URL(TEST_DATABASE_URL).host} (${error.message}). ` +
        `Start it with "docker compose up -d" from the project root.`,
    )
  }
  try {
    await client.query(sql)
  } finally {
    await client.end()
  }
}

// After all tests in this file: close connections and drop the temporary schemas.
after(async () => {
  for (const { db, schema } of opened) {
    await db.close()
    await adminQuery(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
  }
})

/**
 * A fresh, seeded API for one test suite. Each suite gets its own PostgreSQL schema,
 * so suites never see each other's changes and the real data is never touched.
 * External services are switched off.
 */
export async function setup() {
  const schema = `tripza_test_${process.pid}_${opened.length + 1}`
  await adminQuery(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}`)

  const db = connectDatabase(TEST_DATABASE_URL, { options: `-c search_path=${schema}`, max: 4 })
  opened.push({ db, schema })
  await applySchema(db)
  await seedDatabase(db, { bcryptRounds: 4 })

  const testConfig = { ...config, bcryptRounds: 4 }
  const app = createApp({ db, config: testConfig, liveApis: false, logRequests: false })
  return { db, app, api: supertest(app) }
}

export async function login(api, account = DEMO_ACCOUNTS.traveler) {
  const res = await api.post("/api/auth/login").send({ email: account.email, password: account.password })
  if (res.status !== 200) throw new Error(`Login failed for ${account.email}: ${res.status}`)
  return { token: res.body.token, user: res.body.user, auth: { Authorization: `Bearer ${res.body.token}` } }
}

export async function registerAndLogin(api, overrides = {}) {
  const body = { name: "Test Traveler", email: `user${Date.now()}${Math.random()}@test.com`, password: "Secret123", ...overrides }
  const res = await api.post("/api/auth/register").send(body)
  return { token: res.body.token, user: res.body.user, auth: { Authorization: `Bearer ${res.body.token}` } }
}
