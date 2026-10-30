import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql")
const TABLES = ["expenses", "trips", "favorites", "reviews", "places", "destinations", "newsletter_subscribers", "users"]

// Return counts and NUMERIC values as JS numbers, and DATE columns as plain "YYYY-MM-DD" strings
// (the default would turn them into Date objects at local midnight).
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value))
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value))
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value)

/** Converts `?` placeholders to PostgreSQL's `$1, $2, …`. */
const toPostgres = (sql) => {
  let index = 0
  return sql.replace(/\?/g, () => `$${++index}`)
}

/**
 * A small wrapper around a pg Pool (or a single client inside a transaction)
 * with get / all / run helpers, so models can write plain SQL with `?` placeholders.
 */
export class Database {
  constructor(executor, { isTransaction = false } = {}) {
    this.executor = executor
    this.isTransaction = isTransaction
  }

  async query(sql, params = []) {
    return this.executor.query(toPostgres(sql), params)
  }

  /** All matching rows. */
  async all(sql, params = []) {
    return (await this.query(sql, params)).rows
  }

  /** The first matching row, or undefined. */
  async get(sql, params = []) {
    return (await this.query(sql, params)).rows[0]
  }

  /** Runs a statement and reports how many rows it changed (plus any RETURNING rows). */
  async run(sql, params = []) {
    const result = await this.query(sql, params)
    return { changes: result.rowCount, rows: result.rows }
  }

  /** Runs SQL text that may contain several statements (no parameters). */
  async exec(sql) {
    await this.executor.query(sql)
  }

  /** Runs `work` inside a transaction, rolling back if it throws. Nested calls join the outer transaction. */
  async transaction(work) {
    if (this.isTransaction) return work(this)
    const client = await this.executor.connect()
    try {
      await client.query("BEGIN")
      const result = await work(new Database(client, { isTransaction: true }))
      await client.query("COMMIT")
      return result
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  close() {
    return this.executor.end()
  }
}

/** Opens a connection pool. `options` are passed to pg.Pool (e.g. a search_path for tests). */
export function connectDatabase(connectionString, options = {}) {
  return new Database(new pg.Pool({ connectionString, max: 10, ...options }))
}

/** Waits until PostgreSQL accepts connections (useful right after `docker compose up`). */
export async function waitForDatabase(db, { attempts = 15, delayMs = 1000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      await db.query("SELECT 1")
      return
    } catch (error) {
      if (attempt >= attempts) {
        error.message = `Cannot connect to PostgreSQL (${error.message}). Is the database running? Start it with "docker compose up -d".`
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

/** Creates any missing tables and indexes. Safe to run on every start. */
export async function applySchema(db) {
  await db.exec(fs.readFileSync(schemaPath, "utf8"))
}

/** Drops every Tripza table (used by `npm run seed` to start from scratch). */
export async function dropSchema(db) {
  await db.exec(`DROP TABLE IF EXISTS ${TABLES.join(", ")} CASCADE`)
}
