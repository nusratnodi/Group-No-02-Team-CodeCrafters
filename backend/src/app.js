import fs from "node:fs"
import path from "node:path"
import cors from "cors"
import express from "express"
import helmet from "helmet"
import morgan from "morgan"
import { config as defaultConfig } from "./config.js"
import { createAuthMiddleware } from "./middleware/auth.js"
import { apiNotFound, errorHandler } from "./middleware/errorHandler.js"
import { createModels } from "./models/index.js"
import authRoutes from "./routes/auth.js"
import destinationRoutes from "./routes/destinations.js"
import expenseRoutes from "./routes/expenses.js"
import favoriteRoutes from "./routes/favorites.js"
import miscRoutes from "./routes/misc.js"
import navigationRoutes from "./routes/navigation.js"
import placeRoutes from "./routes/places.js"
import reviewRoutes from "./routes/reviews.js"
import tripRoutes from "./routes/trips.js"
import userRoutes from "./routes/users.js"
import weatherRoutes from "./routes/weather.js"
import { createServices } from "./services/index.js"

/**
 * Builds the Express application. Everything it depends on is passed in,
 * so tests can use an in-memory database and turn off external APIs.
 */
export function createApp({ db, config = defaultConfig, liveApis = config.liveApis, logRequests = true } = {}) {
  const models = createModels(db)
  const services = createServices({ models, config, liveApis })
  const auth = createAuthMiddleware(services.auth)
  const ctx = { db, models, services, auth, config, liveApis }

  const app = express()
  app.disable("x-powered-by")
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "img-src": ["'self'", "data:", "https:"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
          "upgrade-insecure-requests": null,
        },
      },
    }),
  )
  app.use(cors({ origin: config.corsOrigin === "*" ? "*" : config.corsOrigin.split(",").map((o) => o.trim()) }))
  app.use(express.json({ limit: "1mb" }))
  if (logRequests) app.use(morgan(config.env === "production" ? "combined" : "dev"))

  app.use("/api", miscRoutes(ctx))
  app.use("/api/auth", authRoutes(ctx))
  app.use("/api/users", userRoutes(ctx))
  app.use("/api/destinations", destinationRoutes(ctx))
  app.use("/api/reviews", reviewRoutes(ctx))
  app.use("/api/favorites", favoriteRoutes(ctx))
  app.use("/api", placeRoutes(ctx))
  app.use("/api/weather", weatherRoutes(ctx))
  app.use("/api/navigation", navigationRoutes(ctx))
  app.use("/api/trips", tripRoutes(ctx))
  app.use("/api/expenses", expenseRoutes(ctx))
  app.use("/api", apiNotFound)

  // In production the API also serves the built React app (frontend/dist).
  const indexHtml = path.join(config.frontendDist, "index.html")
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(config.frontendDist, { index: false }))
    app.use((req, res, next) => (req.method === "GET" ? res.sendFile(indexHtml) : next()))
  }

  app.use(errorHandler)
  return app
}
