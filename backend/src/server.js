import { createApp } from "./app.js"
import { config } from "./config.js"
import { applySchema, connectDatabase, waitForDatabase } from "./db/database.js"
import { isEmpty, seedDatabase } from "./db/seed.js"

const db = connectDatabase(config.databaseUrl)

try {
  await waitForDatabase(db)
  await applySchema(db)
  if (await isEmpty(db)) {
    console.log("Empty database detected — loading sample data…")
    await seedDatabase(db, { bcryptRounds: config.bcryptRounds })
  }
} catch (error) {
  console.error(error.message)
  await db.close()
  process.exit(1)
}

const app = createApp({ db })
const server = app.listen(config.port, () => {
  console.log(`Tripza API running on http://localhost:${config.port}`)
  console.log(`Database: PostgreSQL (${new URL(config.databaseUrl).host})`)
  console.log(`Live external APIs: ${config.liveApis ? "on" : "off (offline estimates)"}`)
})

function shutdown() {
  server.close(async () => {
    await db.close()
    process.exit(0)
  })
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
