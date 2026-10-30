import path from "node:path"
import { fileURLToPath } from "node:url"

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || "tripza-dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
  // Matches the PostgreSQL container in docker-compose.yml.
  databaseUrl: process.env.DATABASE_URL || "postgres://tripza:tripza@localhost:5432/tripza",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  liveApis: process.env.LIVE_APIS !== "false",
  frontendDist: path.resolve(backendRoot, "..", "frontend", "dist"),
  userAgent: "Tripza/1.0 (CSE0613316 academic project)",
}
