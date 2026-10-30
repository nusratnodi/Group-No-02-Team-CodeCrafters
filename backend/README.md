# Tripza API (backend)

Express 5 REST API backed by PostgreSQL (run in Docker with `../docker-compose.yml`). See the [main README](../README.md) for setup, the endpoint list and demo accounts.

```bash
npm run db:up   # start PostgreSQL in Docker (same as `docker compose up -d` in the project root)
npm install
npm run seed    # drop and recreate the tables, then load the sample data
npm run dev     # http://localhost:4000 (auto-restarts on changes)
npm test        # 72 unit + API tests (each suite uses a temporary schema in the same database)
```

Requires Node.js 22.9+ and Docker. Copy `.env.example` to `.env` to change settings; `LIVE_APIS=false` runs without any external API calls.

Layout: `src/routes` (HTTP + validation) → `src/services` (business logic, external APIs) → `src/models` (SQL). Design documents are in [`../docs`](../docs).
