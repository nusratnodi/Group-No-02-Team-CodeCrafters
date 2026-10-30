# Tripza – A Tourism and Travel Exploration System

**Group No-02 · Team CodeCrafters**

Tripza brings destination discovery, maps and routes, nearby services, weather, trip budgeting, favorites and reviews together in one website, so travelers don't have to switch between apps to plan a trip.

| | |
| --- | --- |
| **Course** | Software Project Design & Development Lab (CSE0613316) |
| **Submitted to** | Shad Ahmed, Lecturer |
| **Program / Department** | BSc, Department of CSE |
| **Batch / Section / Semester** | 56 / 5C2 / Autumn |
| **UI/UX design (Figma)** | <https://tamp-piece-02762865.figma.site/> |

---

## Team members and contribution

All four members contributed equally to planning, design, development, testing and documentation.

| # | Name | Student ID | Contribution |
| --- | --- | --- | --- |
| 1 | Nusrat Nodi | 04324205101211 | 25% |
| 2 | Maimuna Nowshen Mahima | 04324205101208 | 25% |
| 3 | Maksuda Akter Mohona | 04324205101209 | 25% |
| 4 | Safin Islam | 04324205101195 | 25% |

---

## Documentation

| Document | Contents |
| --- | --- |
| [UML diagrams](docs/UML_DIAGRAMS.md) | Use case, activity, sequence, state machine, component, deployment and ER diagrams |
| [Class diagram](docs/CLASS_DIAGRAM.md) | Domain model and backend classes (models, services, middleware) with responsibilities |
| [Use cases](docs/USE_CASES.md) | 16 use case specifications (UC-01 to UC-16) traced to the proposal features |
| [Test cases](docs/TEST_CASES.md) | Test plan, 93 automated tests, 30 manual UI cases, 8 non-functional cases, traceability matrix and results |

---

## Features

Every feature from the project proposal is implemented end to end (React frontend → REST API → PostgreSQL).

| Proposal feature | What Tripza does |
| --- | --- |
| **a. Tourist destination exploration** | Search by name, city or tag; filter by category (Beach, Mountain, Historical, City, Nature), region, budget band and minimum rating; sort by rating, popularity, price, name or newest. Each destination page has a photo gallery, description, best time to visit, entry fee, opening hours, how to get there and a local tip. 16 sample destinations (12 in Bangladesh, 4 from the Figma design). |
| **b. Location and navigation** | Interactive OpenStreetMap maps (Leaflet). The route planner searches any city or address (or uses the device's location), draws the road route and gives distance and travel time by car, bus or on foot. "Start navigation" opens turn-by-turn directions in Google Maps. |
| **c. Nearby places** | Restaurants, hospitals and pharmacies, hotels, shopping, ATMs and attractions around a destination, the traveler's own location or any area on the map. Filter by category, sort by distance or rating, change the radius, save places and get directions. Live OpenStreetMap results are used where Tripza has no curated places. |
| **d. Weather information** | Current conditions (temperature, feels-like, humidity, wind, visibility, sunrise/sunset), a 7-day forecast and a travel suggestion such as "Pack an umbrella" or "Good day for sightseeing". Live data from Open-Meteo. |
| **e. Expense tracker** | Create trip budgets (dates, budget, currency: USD, BDT, EUR, GBP, INR). Record expenses as Transportation, Accommodation, Food, Shopping or Other. See total spent, remaining amount, spending per day, a category donut chart and a budget status (on track, warning at 80%, over budget above 100%). |
| **f. Bookmark / favorite** | Save destinations and nearby places with one tap; every heart icon stays in sync; a Favorites page lists both. |
| **g. Reviews and feedback** | 1–5 star reviews with comments, average rating and star distribution; edit or delete your own reviews (one per destination); admins can remove inappropriate reviews. |
| **h. User-friendly interface** | Built from the Tripza Figma design; responsive from phones (bottom navigation bar) to desktops; clear loading, empty and error states; accessible forms and dialogs; toasts for feedback. |

Also included: registration and login (JWT), profile and password management, newsletter sign-up, and an admin dashboard to add, edit and delete destinations and see statistics.

---

## Screenshots

| Home | Destination details |
| --- | --- |
| ![Home page](docs/screenshots/home.jpg) | ![Destination page](docs/screenshots/destination-details.jpg) |
| **Route planner** | **Nearby places** |
| ![Route planner](docs/screenshots/route-planner.jpg) | ![Nearby places](docs/screenshots/nearby.jpg) |
| **Weather** | **Expense tracker** |
| ![Weather](docs/screenshots/weather.jpg) | ![Expense tracker](docs/screenshots/expense-tracker.jpg) |
| **Explore** | **Admin dashboard** |
| ![Explore](docs/screenshots/explore.jpg) | ![Admin dashboard](docs/screenshots/admin.jpg) |

More in [docs/screenshots](docs/screenshots) (login, reviews, profile and phone layouts).

---

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS v4 + the design's CSS tokens, Leaflet / React Leaflet, lucide-react icons |
| Backend | Node.js 22+, Express 5, JSON Web Tokens, bcrypt password hashing, Helmet, CORS |
| Database | PostgreSQL 17 running in Docker (docker compose), accessed with `pg` (node-postgres) |
| External data (no API keys needed) | Open-Meteo (weather), OSRM at routing.openstreetmap.de (routes), Nominatim (place search), Overpass API (live nearby places), OpenStreetMap tiles (maps), Google Maps (turn-by-turn navigation link) |
| Testing | Node.js test runner + supertest (backend), Vitest + Testing Library (frontend) |

```mermaid
flowchart LR
    Browser["React app<br/>(frontend)"] -->|"REST /api + JWT"| API["Express API<br/>routes → services → models"]
    API --> DB[("PostgreSQL 17<br/>Docker container")]
    API --> Ext["Open-Meteo · OSRM · Nominatim · Overpass"]
    Browser --> Tiles["OpenStreetMap tiles"]
```

Every external call has a timeout and an offline fallback (estimated weather, straight-line route estimates, local search), so the app keeps working without internet. Set `LIVE_APIS=false` to run fully offline.

---

## Getting started

### Requirements

- **Node.js 22.9 or newer** and npm
- **Docker** with Docker Compose (Docker Desktop on Windows/macOS) — runs the PostgreSQL database

### Run in development

```bash
# 1. Start the PostgreSQL database in Docker (from the project root)
docker compose up -d

# 2. Install dependencies (once)
cd backend && npm install
cd ../frontend && npm install

# 3. Create the tables and load the sample data
cd ../backend
npm run seed

# 4. Start the API (terminal 1) — http://localhost:4000
npm run dev

# 5. Start the web app (terminal 2) — http://localhost:5173
cd frontend
npm run dev
```

Open <http://localhost:5173>. The API also creates any missing tables when it starts and seeds an empty database automatically, so step 3 is only required to reset the data: `npm run seed` drops the Tripza tables and loads fresh sample data.

From the project root you can also use `npm run db:up`, `npm run install:all`, `npm run seed`, `npm run dev:backend`, `npm run dev:frontend` and `npm test`.

### The database (PostgreSQL in Docker)

`docker-compose.yml` runs PostgreSQL 17 in a container named `tripza-db`. Data is stored in the `tripza-pgdata` Docker volume, so it survives restarts.

| Setting | Value |
| --- | --- |
| Host / port | `localhost:5432` (change with `POSTGRES_PORT=5433 docker compose up -d` if 5432 is taken, and update `DATABASE_URL`) |
| Database | `tripza` |
| User / password | `tripza` / `tripza` (development only) |
| Connection URL | `postgres://tripza:tripza@localhost:5432/tripza` |

```bash
docker compose ps                                          # is the database running and healthy?
docker exec -it tripza-db psql -U tripza -d tripza         # open a SQL prompt (\dt lists the tables)
docker compose down                                        # stop the database (data is kept)
docker compose down -v                                     # stop it and delete all data
```

The sample data contains 8 users, 16 destinations, 91 nearby places, 39 reviews, 5 favorites, 3 trips and 13 expenses.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Traveler (has trips, favorites and reviews) | `demo@tripza.com` | `Demo@1234` |
| Admin | `admin@tripza.com` | `Admin@1234` |

The login page also has **Demo traveler** and **Demo admin** buttons that fill these in.

### Run in production

```bash
docker compose up -d              # the database must be running
cd frontend && npm run build      # creates frontend/dist
cd ../backend && npm start        # serves the API and the built app on http://localhost:4000
```

### Configuration

Copy `backend/.env.example` to `backend/.env` to change settings:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | API port |
| `JWT_SECRET` | development value | **Set a long random secret in production** |
| `JWT_EXPIRES_IN` | `7d` | Login session length |
| `DATABASE_URL` | `postgres://tripza:tripza@localhost:5432/tripza` | PostgreSQL connection (matches `docker-compose.yml`) |
| `TEST_DATABASE_URL` | same as `DATABASE_URL` | Database the API tests use (each suite creates and drops its own temporary schema) |
| `CORS_ORIGIN` | `*` | Allowed browser origins |
| `LIVE_APIS` | `true` | `false` = offline mode (no external API calls) |

For the frontend (`frontend/.env`, see `frontend/.env.example`): `API_PROXY_TARGET` is where the Vite dev server forwards `/api` (default `http://localhost:4000`), and `VITE_API_URL` is only needed when the built app must call an API on a different host.

---

## Testing

```bash
docker compose up -d       # the API tests need the database
cd backend && npm test     # 72 unit + API integration tests (temporary PostgreSQL schemas, external APIs off)
cd frontend && npm test    # 21 unit + component tests
```

Latest results (2026-10-30): **backend 72/72 passing, frontend 21/21 passing**. The app was also checked in headless Chrome on desktop and phone widths with no console or API errors. Test IDs (`TC-AUTH-01`, `TC-FE-19`, …) match [docs/TEST_CASES.md](docs/TEST_CASES.md).

---

## REST API overview

All endpoints are under `/api`. 🔒 = requires `Authorization: Bearer <token>`; 🛡️ = admin only. Errors are returned as `{ "error": { "message": "...", "details": { "field": "message" } } }`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register` · `POST /auth/login` · `GET /auth/me` 🔒 |
| Profile | `GET /users/me` 🔒 · `PUT /users/me` 🔒 · `PUT /users/me/password` 🔒 |
| Destinations | `GET /destinations?q=&category=&region=&budget=&minRating=&sort=&page=&limit=` · `GET /destinations/meta` · `GET /destinations/:idOrSlug` · `POST /destinations` 🛡️ · `PUT /destinations/:id` 🛡️ · `DELETE /destinations/:id` 🛡️ |
| Nearby places | `GET /nearby?destination=<slug>` or `?lat=&lng=` with `&category=&sort=&radius=&limit=` · `GET /places/:id` |
| Weather | `GET /weather?destination=<slug>` or `?lat=&lng=&name=` |
| Navigation | `GET /navigation/route?from=lat,lng&to=lat,lng&mode=car\|bus\|walk` (or `destination=<slug>` instead of `to`) · `GET /navigation/geocode?q=` |
| Trips & expenses | `GET /trips` 🔒 · `POST /trips` 🔒 · `GET /trips/:id` 🔒 · `PUT /trips/:id` 🔒 · `DELETE /trips/:id` 🔒 · `GET /trips/:id/expenses?category=` 🔒 · `POST /trips/:id/expenses` 🔒 · `PUT /expenses/:id` 🔒 · `DELETE /expenses/:id` 🔒 |
| Favorites | `GET /favorites` 🔒 · `POST /favorites` 🔒 · `DELETE /favorites/:itemType/:itemId` 🔒 |
| Reviews | `GET /reviews?destination=&mine=&page=&limit=` · `POST /reviews` 🔒 · `PUT /reviews/:id` 🔒 · `DELETE /reviews/:id` 🔒 (author or admin) |
| Other | `GET /health` · `POST /newsletter` · `GET /admin/stats` 🛡️ |

---

## Project structure

```
Group No-02_Team CodeCrafters/
├── README.md                 ← this file
├── package.json              ← convenience scripts for both apps
├── docker-compose.yml        ← PostgreSQL database container
├── docs/
│   ├── UML_DIAGRAMS.md       ← UML diagrams
│   ├── CLASS_DIAGRAM.md      ← class diagrams
│   ├── USE_CASES.md          ← use case specifications
│   ├── TEST_CASES.md         ← test plan and test cases
│   └── screenshots/
├── backend/
│   ├── src/
│   │   ├── server.js         ← starts the API (creates tables, seeds an empty database)
│   │   ├── app.js            ← Express app: security, routes, error handling
│   │   ├── config.js
│   │   ├── db/               ← schema.sql (PostgreSQL), connection helpers, seed script and sample data
│   │   ├── models/           ← data access: User, Destination, Place, Review, Favorite, Trip, Expense, Newsletter
│   │   ├── services/         ← Auth, Weather, Route, Geocode, Nearby, Budget
│   │   ├── routes/           ← REST endpoints and validation schemas
│   │   ├── middleware/       ← authentication, error handling
│   │   └── utils/            ← validation, geo maths, HTTP client, errors
│   └── tests/                ← 72 automated tests
└── frontend/
    ├── index.html
    └── src/
        ├── main.tsx, App.tsx ← providers and routes
        ├── index.css         ← design system from the Figma prototype (unchanged)
        ├── app.css           ← additional app styles using the same design tokens
        ├── api/              ← typed API client
        ├── context/          ← auth, favorites, toasts
        ├── components/       ← layout, cards, map, form controls
        ├── pages/            ← Home, Auth, Explore, Destination, Route, Nearby, Weather, Expenses, Favorites, Reviews, Profile, Admin
        └── utils/, hooks/    ← formatting, budget helpers, geolocation, data loading
```

---

## Credits and notes

- **Design:** Tripza Travel Platform UI/UX (Figma) — <https://tamp-piece-02762865.figma.site/>.
- **Map data** © OpenStreetMap contributors. Weather by [Open-Meteo](https://open-meteo.com/). Routing by the [FOSSGIS OSRM servers](https://routing.openstreetmap.de/). Place search by Nominatim.
- **Photos:** Bangladesh destinations from [Wikimedia Commons](https://commons.wikimedia.org/) (Creative Commons licences; see each file's page for the author); other photos from Unsplash via the Figma design.
- The nearby places, reviews and trips in the sample data are **illustrative demo data** with approximate coordinates; they are not live business listings.
- The public OpenStreetMap services used here are free for light use such as this academic project. A production deployment should use its own or a commercial tile, routing and geocoding provider.
