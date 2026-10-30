# Test Plan and Test Cases

*Tripza – Group No-02, Team CodeCrafters · CSE0613316 Software Project Design & Development Lab · [Back to README](../README.md)*

This document is the test plan for **Tripza – A Tourism and Travel Exploration System**. It lists every automated backend test with its ID, the manual UI test cases for the frontend, the non-functional checks, a traceability matrix from use cases to tests, and the latest results. Use case IDs (UC-xx) refer to [USE_CASES.md](USE_CASES.md).

## Contents

- [Test plan](#test-plan)
- [Automated backend tests](#automated-backend-tests)
- [Manual UI test cases](#manual-ui-test-cases)
- [Non-functional test cases](#non-functional-test-cases)
- [Frontend automated tests](#frontend-automated-tests)
- [Traceability matrix](#traceability-matrix)
- [Results summary](#results-summary)

---

## Test plan

### Scope

**In scope**

- The REST API: every endpoint under `/api`, including authentication, access control, validation and error responses.
- Business logic: budget summary and status, trip length, weather descriptions and travel suggestions, offline forecast, route estimation, distance and coordinate helpers, request validation.
- The React frontend pages: Home, Login/Register, Explore, Destination details, Route planner, Nearby, Weather, Expenses, Favorites, Reviews, Profile, Admin and the 404 page.
- Non-functional qualities: responsive layout, offline operation, behaviour when external APIs fail, password and token security.

**Out of scope**

- The accuracy of third-party data (Open-Meteo forecasts, OSRM routes, OpenStreetMap places, Google Maps directions).
- Load and performance testing.

### Test levels

| Level | What is tested | Tool | Location |
| --- | --- | --- | --- |
| Unit | Pure functions: `BudgetService`, weather and route helpers, `geo` utilities, `validate()` | `node:test` | `backend/tests/unit.test.js` |
| API integration | Each endpoint through the full stack: Express routing, auth middleware, validation, models and PostgreSQL | `node:test` + supertest | `backend/tests/*.test.js` |
| Frontend automated | Utilities, API client, components and the login/sign-up page | Vitest + Testing Library | `frontend/src/**/*.test.ts(x)` (see [Frontend automated tests](#frontend-automated-tests)) |
| UI / manual | User flows in a real browser against the running backend | Manual, browser dev tools | TC-UI-01 to TC-UI-30 |
| Non-functional | Responsive layout, offline mode, failure fallbacks, security | Manual, with automated checks where noted | TC-NF-01 to TC-NF-09 |

### Tools

- **Backend:** the built-in Node.js test runner (`node:test`) with `node:assert/strict`, and **supertest** to send HTTP requests to the Express app in the same process (no network port needed).
- **Frontend:** **Vitest** with **Testing Library** (`@testing-library/react`).
- **Manual:** Chrome or Firefox (current version) with the developer tools device toolbar for screen sizes.

### How to run

Node.js 22.9 or newer and Docker are required. The API tests run against the PostgreSQL container, so start it first.

```bash
# Start PostgreSQL in Docker (from the project root)
docker compose up -d

# Backend: unit and API integration tests
cd backend && npm install && npm test

# Frontend: component tests
cd frontend && npm install && npm test
```

For manual testing, start PostgreSQL with `docker compose up -d`, then the backend with `cd backend && npm run dev` (port 4000; the database is created and seeded on first start, `npm run seed` recreates it) and start the frontend dev server with `cd frontend && npm run dev`.

### Test environment

- **Fresh database per suite.** Every `describe` block calls `setup()` from `tests/helpers.js`, which creates a new, empty PostgreSQL schema (`tripza_test_<pid>_<n>`) in the Docker database, connects with its `search_path` set to that schema, applies `schema.sql` and loads the sample data: 16 destinations, 8 users, curated nearby places and reviews, and for the demo traveler 3 trips, 5 favorites and 2 reviews. The bcrypt cost is lowered to 4 to keep the tests fast. The temporary schemas are dropped when each test file finishes, so the real Tripza data is never touched.
- **External APIs disabled.** The app is created with `liveApis: false`, so no network calls are made: weather is simulated, routes are estimated, geocoding searches local destinations only and nearby search uses curated places. Results are therefore deterministic.
- **Ordering.** Suites run one at a time (`--test-concurrency=1`). Tests inside a suite run in file order and share that suite's database; for example the expense tracker tests build on the trip created in TC-TRIP-01.
- **Manual tests** use the seeded development database and these accounts:

| Role | Email | Password |
| --- | --- | --- |
| Traveler (demo) | `demo@tripza.com` | `Demo@1234` |
| Admin | `admin@tripza.com` | `Admin@1234` |
| Other travelers | `sofia@example.com`, `rahim@example.com` and others | `Traveler@123` |

### Pass criteria

A test passes when the actual result matches the expected result. Any difference is recorded as a defect with the test ID, fixed, and the test is run again.

---

## Automated backend tests

All 72 tests below are in `backend/tests`. The ID and title are copied from the test file; the test name in the runner output is `<ID> <title>`.

### Authentication API (`auth.test.js`)

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-AUTH-01 | registers a new traveler and returns a token | UC-01 | `POST /api/auth/register` with name "Nusrat Nodi", email `nodi@example.com`, password `Travel2026` | 201; a token is returned; `user.email` matches and `user.role` is `user`; the response has no `password_hash` | Automated (API) | Pass |
| TC-AUTH-02 | rejects registration with an email that is already used | UC-01 | Register with `DEMO@tripza.com` (the demo email in different letter case) | 409; `details.email` says the email is already registered | Automated (API) | Pass |
| TC-AUTH-03 | validates name, email and password strength | UC-01 | Register with name "A", email "not-an-email", password "password" | 400; `details` has exactly `name`, `email` and `password`; the password message asks for a letter and a number | Automated (API) | Pass |
| TC-AUTH-04 | logs in with valid credentials | UC-02 | `POST /api/auth/login` with `demo@tripza.com` / `Demo@1234` | 200; a token is returned; `user.name` is "Alex Johnson" | Automated (API) | Pass |
| TC-AUTH-05 | rejects a wrong password with a generic message | UC-02 | Log in as the demo traveler with password `WrongPass1` | 401 with message "Invalid email or password" | Automated (API) | Pass |
| TC-AUTH-06 | returns the current user for a valid token | UC-02 | Logged in as demo traveler; `GET /api/auth/me` with the Bearer token | 200; `user.email` is `demo@tripza.com` | Automated (API) | Pass |
| TC-AUTH-07 | rejects missing or invalid tokens on protected routes | UC-02 | `GET /api/auth/me` with no token, then with `Bearer not-a-real-token` | 401 for both; the invalid-token message says the session has expired | Automated (API) | Pass |

### User profile API (`auth.test.js`)

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-USER-01 | shows the profile with trip, favorite and review counts | UC-03 | Logged in as demo traveler; `GET /api/users/me` | 200; `stats` is 3 trips, 5 favorites, 2 reviews | Automated (API) | Pass |
| TC-USER-02 | updates name, location and bio | UC-03 | `PUT /api/users/me` with name "Alex J.", location "Sylhet, Bangladesh", bio "" | 200; name and location updated; the empty bio is stored as `null` | Automated (API) | Pass |
| TC-USER-03 | changes the password only when the current password is correct | UC-03 | `PUT /api/users/me/password` with a wrong current password, then with the correct one and new password `NewPass2026` | Wrong current password: 401. Correct: 200, and logging in with the new password returns 200 | Automated (API) | Pass |

### Destination exploration API (`destinations.test.js`)

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-DEST-01 | lists destinations with ratings and pagination info | UC-04 | `GET /api/destinations?limit=5` on the seeded data | 200; total 16, 5 items, 4 pages; every item has rating above 0, reviewCount above 0 and a gallery array | Automated (API) | Pass |
| TC-DEST-02 | searches by name, location or tag | UC-04 | `GET /api/destinations?q=sylhet` | Exactly "Jaflong" and "Srimangal Tea Gardens" | Automated (API) | Pass |
| TC-DEST-03 | filters by category, region, budget and minimum rating | UC-04 | `?category=beach&region=Asia`, then `?budget=high`, then `?minRating=4.8` | 3 results, all Beach in Asia (lower-case category accepted); every high-budget item has avgCost of 1500 or more; the top-rated list is not empty and every rating is 4.8 or more | Automated (API) | Pass |
| TC-DEST-04 | sorts results and rejects unknown sort options | UC-04 | `?sort=price_low&limit=50`, then `?sort=random` | avgCost in ascending order; the unknown sort returns 400 | Automated (API) | Pass |
| TC-DEST-05 | shows destination details by slug or id | UC-05 | `GET /api/destinations/sajek-valley`, then by its numeric id, then `/api/destinations/atlantis` | Slug: 200, "Sajek Valley" with a local tip. Id: the same slug. Unknown: 404 | Automated (API) | Pass |
| TC-DEST-06 | only admins can create destinations | UC-15 | `POST /api/destinations` (Ratargul Swamp Forest) as guest, traveler and admin | Guest 401; traveler 403; admin 201 with slug `ratargul-swamp-forest` and rating 0 | Automated (API) | Pass |
| TC-DEST-07 | validates destination data | UC-15 | Admin posts the destination with category "Desert", latitude 120 and imageUrl `ftp://x` | 400; `details` has exactly `category`, `imageUrl` and `latitude` | Automated (API) | Pass |
| TC-DEST-08 | admins can update and delete destinations | UC-15, UC-11 | Admin updates Cox's Bazar Sea Beach (new bestTime) and deletes it; the demo traveler had it saved | Update 200 with the new bestTime and the same name; delete 204; then GET 404; it is no longer in the traveler's favorites | Automated (API) | Pass |

### Favorites API (`favorites.test.js`)

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-FAV-01 | lists saved destinations and places, newest first | UC-11 | Logged in as demo traveler; `GET /api/favorites` | Destinations: Amalfi Coast, Cox's Bazar Sea Beach, Sajek Valley. Places: Da Gemma, Poushee Restaurant. Each item has `savedAt` | Automated (API) | Pass |
| TC-FAV-02 | saves a destination (and saving twice is harmless) | UC-11 | `POST /api/favorites` for destination Jaflong, twice | First 201, second 200; Jaflong appears once in the list | Automated (API) | Pass |
| TC-FAV-03 | saves a nearby place | UC-11, UC-07 | First place from `GET /api/nearby?destination=jaflong`; `POST /api/favorites` with itemType `place` | 201 | Automated (API) | Pass |
| TC-FAV-04 | rejects unknown items and item types | UC-11 | Destination id 9999; itemType "hotel" | 404; 400 | Automated (API) | Pass |
| TC-FAV-05 | removes a saved item | UC-11 | `DELETE /api/favorites/destination/<Sajek Valley id>`, twice | First 204; second 404 | Automated (API) | Pass |
| TC-FAV-06 | requires login | UC-11 | `GET /api/favorites` without a token | 401 | Automated (API) | Pass |

### Nearby places API (`location.test.js`)

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-NEAR-01 | finds places around a destination, nearest first | UC-07 | `GET /api/nearby?destination=coxs-bazar-sea-beach` | 200; centre name "Cox's Bazar Sea Beach"; source `tripza`; at least 10 places in ascending distance | Automated (API) | Pass |
| TC-NEAR-02 | filters by category (restaurants, hospitals, hotels, shopping, ATMs, others) | UC-07 | Same destination with category `restaurant`, `hospital`, `hotel`, `shopping`, `atm` and `other` | Every category returns results, and all results are of that category | Automated (API) | Pass |
| TC-NEAR-03 | sorts by rating and respects the search radius | UC-07 | Same destination with `sort=rating`, then with `radius=1` | Ratings in descending order; with 1 km every place is within 1 km and there are fewer results than with the default 5 km | Automated (API) | Pass |
| TC-NEAR-04 | works with the traveler's own coordinates | UC-07 | `GET /api/nearby?lat=23.7190&lng=90.3882&category=restaurant` (Old Dhaka) | 200; the results include "Haji Biriyani" | Automated (API) | Pass |
| TC-NEAR-05 | validates location and category | UC-07 | No location; `lat=200&lng=10`; `category=casino`; `destination=nowhere` | 400; 400; 400; 404 | Automated (API) | Pass |
| TC-NEAR-06 | returns details for a single place | UC-07 | First restaurant near Amalfi Coast; `GET /api/places/:id` | 200; "Da Gemma" with destinationName "Amalfi Coast" | Automated (API) | Pass |

### Weather API (`location.test.js`)

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-WEA-01 | returns current conditions, a 7-day forecast and a travel suggestion | UC-08 | `GET /api/weather?destination=sajek-valley` with live APIs off | 200; location "Sajek Valley"; 7 daily entries; numeric temperature and a condition; suggestion level is good, caution or alert; source `simulated` | Automated (API) | Pass |
| TC-WEA-02 | accepts coordinates for the traveler's current location | UC-08 | `GET /api/weather?lat=23.81&lng=90.41&name=Dhaka` | 200; location name "Dhaka"; `location.destination` is `null` | Automated (API) | Pass |
| TC-WEA-03 | rejects requests without a valid location | UC-08 | No parameters; `lat=abc&lng=1` | 400 for both | Automated (API) | Pass |

### Location and navigation API (`location.test.js`)

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-NAV-01 | plans a route to a destination with distance, duration and path | UC-06 | `GET /api/navigation/route?from=23.8103,90.4125&destination=coxs-bazar-sea-beach&mode=car` (from Dhaka, live APIs off) | 200; distance over 280 km; duration above 0 with a text in hours; path of at least 2 points; navigationUrl starts with `https://www.google.com/maps/dir/` | Automated (API) | Pass |
| TC-NAV-02 | travel time depends on the mode (car, bus, walk) | UC-06 | Same start and end with mode `car`, `bus` and `walk` | Duration: car < bus < walk | Automated (API) | Pass |
| TC-NAV-03 | validates route parameters | UC-06 | No `from`; `mode=plane`; no destination or `to` | 400 for each | Automated (API) | Pass |
| TC-NAV-04 | searches places by name for the starting point | UC-06 | `GET /api/navigation/geocode?q=Lalbagh`, then `q=a` | First result "Lalbagh Fort" with type `destination`; the one-letter query returns 400 | Automated (API) | Pass |

### Reviews and feedback API (`reviews.test.js`)

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-REV-01 | lists reviews for a destination with a rating summary | UC-12 | `GET /api/reviews?destination=amalfi-coast` | 200; count 4, average 4.8; distribution 75% five stars, 25% four stars, 0% for the rest; items include `userName` | Automated (API) | Pass |
| TC-REV-02 | a logged-in traveler can post a review and the rating updates | UC-13 | A new traveler posts rating 1 for Sajek Valley | 201; Sajek Valley now has 4 reviews and rating 3.8 (15 / 4 = 3.75, rounded) | Automated (API) | Pass |
| TC-REV-03 | guests cannot post reviews | UC-13 | `POST /api/reviews` without a token | 401 | Automated (API) | Pass |
| TC-REV-04 | validates rating range and comment length | UC-13 | Rating 6 and comment "Short" | 400 with `rating` and `comment` details | Automated (API) | Pass |
| TC-REV-05 | allows only one review per destination per user | UC-13 | The demo traveler, who already reviewed Cox's Bazar Sea Beach, posts another review for it | 409 | Automated (API) | Pass |
| TC-REV-06 | authors can edit and delete their own reviews only | UC-13 | Owner creates a review; another traveler tries to edit and delete it; the owner changes the rating to 4 and then deletes it | Other traveler: 403 for both. Owner edit: 200, rating 4, comment unchanged. Owner delete: 204. Editing afterwards: 404 | Automated (API) | Pass |
| TC-REV-07 | admins can remove inappropriate reviews | UC-16 | A new traveler posts a spam review; the admin deletes it | 204 | Automated (API) | Pass |
| TC-REV-08 | lists the current user's own reviews | UC-12, UC-13 | Demo traveler calls `GET /api/reviews?mine=true`; then the same without a token | 200 with total 2, all by "Alex Johnson"; without a token 401 | Automated (API) | Pass |

### System, newsletter and admin API (`system.test.js`)

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-SYS-01 | health check reports the API and database are running | — | `GET /api/health` | 200; status `ok` and database `ok` | Automated (API) | Pass |
| TC-SYS-02 | newsletter sign-up accepts new emails once | UC-14 | `POST /api/newsletter` with `fan@example.com`, then `FAN@example.com`, then "nope" | 201; 200 (already subscribed, case-insensitive); 400 | Automated (API) | Pass |
| TC-SYS-03 | admin statistics are restricted to admins | UC-15 | `GET /api/admin/stats` as traveler, then as admin | Traveler 403; admin 200 with 16 destinations and 8 users | Automated (API) | Pass |
| TC-SYS-04 | returns JSON errors for unknown routes and malformed JSON | — | `GET /api/does-not-exist`; login with the body `{bad json` | 404 with "Route not found"; 400 with "Request body is not valid JSON" | Automated (API) | Pass |
| TC-SYS-05 | sets security headers | — | `GET /api/health` | `X-Content-Type-Options: nosniff`; no `X-Powered-By` header | Automated (API) | Pass |

### Expense tracker API (`trips.test.js`)

These tests run in the order below and share one trip.

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-TRIP-01 | creates a trip budget | UC-09 | New traveler; `POST /api/trips` "Sajek Weekend", 2030-01-10 to 2030-01-14, budget 20000 BDT | 201; summary: 5 days, totalSpent 0, remaining 20000 | Automated (API) | Pass |
| TC-TRIP-02 | rejects an end date before the start date and invalid budgets | UC-09 | Start 2030-02-10 with end 2030-02-01; budget -5 | 400 with an `endDate` detail; 400 | Automated (API) | Pass |
| TC-EXP-01 | records categorized expenses and updates the summary | UC-10 | Trip from TC-TRIP-01; add Transportation 3000, Accommodation 9000, Food 1200 | Each 201; the trip has 3 expenses, totalSpent 13200, remaining 6800, percentUsed 66, status `on-track`; categories ordered Accommodation, Transportation, Food | Automated (API) | Pass |
| TC-EXP-02 | validates expense amount, category and date | UC-10 | Category "Gifts", amount 0, spentOn "10/01/2030" | 400; `details` has exactly `amount`, `category` and `spentOn` | Automated (API) | Pass |
| TC-EXP-03 | filters expenses by category | UC-10 | `GET /api/trips/:id/expenses?category=Food` | Only "Bamboo chicken dinner" | Automated (API) | Pass |
| TC-EXP-04 | edits and deletes an expense | UC-10 | Change the Food expense amount to 10000, then delete it | Edit 200 with the title unchanged; summary status `over` and remaining -2000; delete 204; then totalSpent 12000 and status `on-track` | Automated (API) | Pass |
| TC-TRIP-03 | updates the trip budget | UC-09 | `PUT /api/trips/:id` with budget 30000 | 200; budget 30000; percentUsed 40 | Automated (API) | Pass |
| TC-TRIP-04 | keeps each traveler's trips private | UC-09, UC-10 | The demo traveler tries to read the other traveler's trip and delete one of its expenses | Trip 404; it is not in the demo traveler's list; expense delete 404 | Automated (API) | Pass |
| TC-TRIP-05 | deleting a trip deletes its expenses | UC-09, UC-10 | The owner deletes the trip, then tries to edit one of its former expenses | Delete 204; trip GET 404; expense edit 404 | Automated (API) | Pass |
| TC-TRIP-06 | lists trips with their budget summaries | UC-09 | Demo traveler; `GET /api/trips` | 200; 3 trips; "Cox's Bazar Getaway" in BDT with totalSpent 21800 and destinationSlug `coxs-bazar-sea-beach` | Automated (API) | Pass |

### Unit tests (`unit.test.js`)

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UNIT-01 | counts trip days inclusively and the days still ahead | UC-09, UC-10 | `tripLength()` and `daysRemaining()` for 2030-06-16 to 2030-06-22 with different "today" dates | 7 days (1 for a same-day trip); 3 days left on 20 June; 7 before the trip; 0 after it | Automated (Unit) | Pass |
| TC-UNIT-02 | summarises spending by category and budget status | UC-10 | `summarizeBudget()` with budget 1000 and expenses Food 150, Accommodation 600, Food 50, on 20 June | totalSpent 800, remaining 200, percentUsed 80, status `warning`, perDayRemaining 66.67; Accommodation 600 (75%), Food 200 (25%) | Automated (Unit) | Pass |
| TC-UNIT-03 | flags overspending | UC-10 | One Shopping expense of 1200.5 against budget 1000 | Status `over`; remaining -200.5; perDayRemaining 0 | Automated (Unit) | Pass |
| TC-UNIT-04 | maps WMO weather codes to conditions | UC-08 | `describeWeather()` with codes 0, 63, 95 and 1234 | "Clear sky" with icon `sun`; icon `rain`; "Thunderstorm"; "Unknown" | Automated (Unit) | Pass |
| TC-UNIT-05 | suggests travel advice from conditions | UC-08 | `travelSuggestion()` with mild weather, 80% rain chance, a thunderstorm, 38 °C, and 55 km/h wind | `good`; "Pack an umbrella"; `alert`; "Very hot — plan for shade"; "Windy conditions" | Automated (Unit) | Pass |
| TC-UNIT-06 | offline forecast is deterministic and complete | UC-08 | `simulatedForecast()` twice for Dhaka on the same date | Identical results; 7 days; every day's high is above its low | Automated (Unit) | Pass |
| TC-UNIT-07 | calculates great-circle distance | UC-06, UC-07 | `haversineKm()` from Dhaka to Chattogram, and from a point to itself | About 213 km (within 5 km); 0 | Automated (Unit) | Pass |
| TC-UNIT-08 | parses coordinates and rejects invalid ones | UC-06, UC-07, UC-08 | `parseCoordinate("23.8,90.4")`, `parseCoordinate("1", "2")`, latitude 91, no values | lat 23.8 / lng 90.4; lat 1 / lng 2; a "valid location" error for the last two | Automated (Unit) | Pass |
| TC-UNIT-09 | estimates routes and formats durations | UC-06 | `estimateRoute()` across 1 degree of longitude on foot; `formatDuration()` with 78, 45 and 120 minutes | Distance over 111 km with source `estimate`; "1 hr 18 min", "45 min", "2 hr" | Automated (Unit) | Pass |
| TC-UNIT-10 | cleans valid input and applies defaults | All forms | `validate()` with name "  Mahima ", age "21" and an unknown field | Name trimmed, age converted to the number 21, unknown field dropped, default kind "a" added | Automated (Unit) | Pass |
| TC-UNIT-11 | reports every invalid field | All forms | Empty name, age 2.5, date 2030-13-45, kind "c" | `HttpError` with status 400 and 4 field details | Automated (Unit) | Pass |
| TC-UNIT-12 | partial validation only checks provided fields | UC-03, UC-09, UC-10, UC-15 | `validate()` in partial mode with only age 5; then with an empty name | Returns only the age; the empty required name is still rejected | Automated (Unit) | Pass |

---

## Manual UI test cases

Run against the frontend dev server and the seeded backend. Unless stated otherwise, start each case logged out with a freshly seeded database.

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-UI-01 | Home page shows all sections | UC-04 | Open `/` as a guest | Hero search (destination text and travel date), category chips, popular destinations loaded from the API (image, name, location, rating), feature cards, call to action and footer with newsletter form are shown; no errors in the browser console | Manual | To run |
| TC-UI-02 | Hero search opens Explore | UC-04 | On `/` type "sylhet" and search | `/explore` opens with the search text applied and shows Jaflong and Srimangal Tea Gardens | Manual | To run |
| TC-UI-03 | Category chip filters Explore | UC-04 | On `/` click the Beach chip | `/explore` shows only Beach destinations and the Beach filter is selected | Manual | To run |
| TC-UI-04 | Newsletter sign-up in the footer | UC-14 | Submit a new email, then the same email again, then "nope" | "You're subscribed!"; then "You're already subscribed."; then an invalid email message; the page does not reload | Manual | To run |
| TC-UI-05 | Register form validation and show/hide password | UC-01 | On `/register` submit name "A", email "x", password "password"; click the show/hide password control | Each field shows its own error; the password error mentions a letter and a number; the control switches the password between hidden and visible | Manual | To run |
| TC-UI-06 | Successful registration signs the user in | UC-01 | Register with a new email and a valid password; log out; try to register the same email again | After the first attempt the user is logged in and the header shows their name; the second attempt shows an "already registered" error on the email field | Manual | To run |
| TC-UI-07 | Log in with a demo account and with a wrong password | UC-02 | On `/login` click "use demo account" (traveler) and submit; log out; log in with `demo@tripza.com` and a wrong password | Demo login succeeds; the wrong password shows "Invalid email or password" and the user stays on `/login` | Manual | To run |
| TC-UI-08 | Protected pages require login | UC-02 | As a guest open `/expenses`, `/favorites` and `/profile` | Each page sends the guest to `/login`; after logging in the pages open normally | Manual | To run |
| TC-UI-09 | Log out | UC-02 | Logged in as demo traveler, click "Log out" on `/profile`, then reload and open `/favorites` | The header shows log-in links again; reloading does not restore the session; `/favorites` asks the user to log in | Manual | To run |
| TC-UI-10 | Explore search and filters | UC-04 | On `/explore` combine search text, category, region, budget band and minimum rating; then clear them | The list and the result count update after each change; every card matches all selected filters; clearing restores all 16 destinations | Manual | To run |
| TC-UI-11 | Explore sort and load more | UC-04 | Select each sort option; click "load more" until all results are shown | The order follows the selected sort (for example price low to high); "load more" adds the next page without duplicates and is no longer offered once all results are shown | Manual | To run |
| TC-UI-12 | Destination details page | UC-05 | Open `/destinations/sajek-valley` | Gallery, quick facts (best time, entry fee, opening hours), Leaflet map with the destination marker, live weather card, top 3 nearby places, latest review, local tip and a "plan a trip budget" link are shown | Manual | To run |
| TC-UI-13 | Save and unsave a destination | UC-11 | As demo traveler click Save on a destination page, check `/favorites`, click again; repeat as a guest | The button shows the saved state and the destination appears in `/favorites`; clicking again removes it; a guest is asked to log in | Manual | To run |
| TC-UI-14 | Unknown destination | UC-05 | Open `/destinations/atlantis` | A "destination not found" message is shown with working navigation; no broken layout or console error | Manual | To run |
| TC-UI-15 | Route planner with a searched starting point | UC-06 | Open `/route?to=coxs-bazar-sea-beach`, type "Dhaka" and choose a suggestion | Suggestions appear while typing; a route line is drawn on the map; the route card shows duration, distance and notes | Manual | To run |
| TC-UI-16 | Travel modes and "use my location" | UC-06 | Switch between car, bus and walk; click "use my location" and allow; repeat and deny | Duration changes with the mode (car fastest, walk slowest); allowing uses the current position as the start; denying shows a message and the search box still works | Manual | To run |
| TC-UI-17 | Start navigation | UC-06 | With a route shown, click "Start navigation" | Google Maps opens in a new tab with the same origin, destination and travel mode (driving, transit or walking) | Manual | To run |
| TC-UI-18 | Nearby category tabs and sort | UC-07 | Open `/nearby?destination=coxs-bazar-sea-beach`; go through all six tabs and both sort options | The list and map markers show only the chosen category; "nearest" orders by distance and "top rated" by rating | Manual | To run |
| TC-UI-19 | Nearby "near me" | UC-07 | Choose "near me" and allow location access; repeat and deny | Allowed: places around the current position, or an empty state if there are none. Denied: an explanatory message and the option to pick a destination | Manual | To run |
| TC-UI-20 | Save a nearby place and get directions | UC-07, UC-11 | As demo traveler save a place from the Nearby list, then use its directions action | The place appears in the Places tab of `/favorites`; directions open for that place | Manual | To run |
| TC-UI-21 | Weather page | UC-08 | Open `/weather?destination=sajek-valley`; change location to another destination, then to "use my location" | Current conditions, a 7-day forecast and a travel suggestion are shown, and they update for each new location | Manual | To run |
| TC-UI-22 | Create, edit and delete a trip | UC-09 | On `/expenses` create a trip whose end date is before its start date, then a valid trip; edit its budget; delete it | The invalid trip shows an error on the end date; the valid trip appears in the trip selector with its budget card; editing updates the cards; deleting removes the trip and its expenses from the page | Manual | To run |
| TC-UI-23 | Add, edit and delete expenses | UC-10 | Select a trip; add one expense per category; try an amount of 0; edit one amount; delete one expense | The amount of 0 is rejected with an error; after each valid action the budget, spent and remaining cards, the spending donut, the progress bar and the list update without reloading the page | Manual | To run |
| TC-UI-24 | Category filter and budget status | UC-10 | Filter the list by Food; then add expenses until spending reaches 80% of the budget and then goes above 100% | Only Food expenses are listed; the status changes from on-track to warning at 80% and to over above 100%, with a negative remaining amount | Manual | To run |
| TC-UI-25 | Favorites page | UC-11 | As demo traveler open `/favorites`; switch tabs; remove every item in one tab | Tab counts are 3 destinations and 2 places; removed items disappear and the count updates; an empty tab shows an empty state | Manual | To run |
| TC-UI-26 | Reviews page | UC-12, UC-13 | Open `/reviews?destination=sajek-valley` as a guest; then as a new traveler write, edit and delete a review, and try to write a second one | The guest sees the rating summary, distribution bars and list and is asked to log in to write; a missing rating or a comment under 10 characters is rejected; the new review appears and the average updates; edit and delete are offered only on the traveler's own review; a second review for the same destination is not accepted | Manual | To run |
| TC-UI-27 | Profile page | UC-03 | As demo traveler open `/profile`; edit name and bio; change the password with a wrong and then the correct current password | Stats show 3 trips, 5 favorites and 2 reviews; upcoming trips are listed; edits are saved and shown; a wrong current password shows "Current password is incorrect"; the correct one shows a success message | Manual | To run |
| TC-UI-28 | Admin dashboard | UC-15 | Open `/admin` as demo traveler, then as admin; add a destination (first with latitude 120), edit it, delete it | The traveler is refused; the admin sees statistics and the destination table; latitude 120 shows a field error; the new destination appears in the table and in Explore; the edit is saved; the deleted destination disappears | Manual | To run |
| TC-UI-29 | Admin removes a review | UC-16 | As admin open `/reviews?destination=amalfi-coast` and delete a review written by another user; then view the page as demo traveler | The review disappears and the summary updates; the demo traveler sees no delete action on other people's reviews | Manual | To run |
| TC-UI-30 | 404 page | — | Open `/no-such-page` | The Tripza 404 page is shown with a way back to Home | Manual | To run |

---

## Non-functional test cases

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-NF-01 | Responsive layout on a phone (375 px) | All (feature h) | Browser device toolbar at 375 px width; visit every route | No horizontal page scrolling; content stacks into one column; navigation, forms, maps and buttons are usable by touch; wide tables scroll inside their own container | Manual (non-functional) | To run |
| TC-NF-02 | Responsive layout on a tablet (768 px) | All (feature h) | Device toolbar at 768 px width; visit every route | Layout adapts without overlapping or cut-off content; maps and charts resize correctly | Manual (non-functional) | To run |
| TC-NF-03 | Desktop layout (1280 px) | All (feature h) | Browser window 1280 px wide; visit every route | Layout matches the Figma prototype; no overlapping or cut-off content | Manual (non-functional) | To run |
| TC-NF-04 | Offline mode with `LIVE_APIS=false` | UC-05, UC-06, UC-07, UC-08 | Set `LIVE_APIS=false` in `backend/.env` and restart; use weather, route planner (search and route) and nearby | `GET /api/health` reports `liveApis: false`; weather source is `simulated`; the route note says "Estimated route"; geocoding suggests Tripza destinations only; nearby shows curated places; every page still works. All automated API tests also run in this mode | Manual (non-functional) | To run |
| TC-NF-05 | Fallback when an external API fails | UC-06, UC-07, UC-08 | `LIVE_APIS=true`, but block the server's internet access (or the API hosts); repeat the steps of TC-NF-04 | Every request still succeeds with fallback data within the timeout (weather 6 s, geocoding 6 s, routing 8 s, Overpass 9 s); no 500 errors | Manual (non-functional) | To run |
| TC-NF-06 | Passwords are hashed and never returned | UC-01, UC-03 | Register a user; read `users.password_hash` with `docker exec tripza-db psql -U tripza -d tripza -c "SELECT email, password_hash FROM users"`; inspect the responses of register, login, `GET /api/auth/me`, `GET /api/users/me` and `PUT /api/users/me` | The stored value is a bcrypt hash (starts with `$2`), not the password; no response contains `password` or `password_hash` (the register response is also checked by TC-AUTH-01) | Manual (non-functional) | To run |
| TC-NF-07 | JWT expiry | UC-02 | Set `JWT_EXPIRES_IN=1m` and restart; log in; wait more than one minute; open `/profile` or call `GET /api/users/me` with the old token | The API returns 401 "Your session has expired. Please log in again."; the web app clears the session and shows the login page | Manual (non-functional) | To run |
| TC-NF-08 | Request body size limit | — | `POST /api/auth/login` with a JSON body larger than 1 MB | 413 "Request body is too large"; the server keeps running | Manual (non-functional) | To run |
| TC-NF-09 | Database runs in Docker and is seeded | — | From the project root run `docker compose up -d`, then `cd backend && npm run seed`; open `GET /api/health` | The `tripza-db` container is healthy; the seed prints 8 users, 16 destinations, 91 places, 39 reviews and 3 trips; health reports `database: ok`; data survives `docker compose down` and `up` again (named volume) | Manual (non-functional) | Pass |

---

## Frontend automated tests

All 21 tests are in `frontend/src` next to the code they test and run with `cd frontend && npm test` (Vitest in a jsdom browser environment; `fetch` is mocked, so no backend is needed). Maps (Leaflet) are not rendered in these tests; they are covered by the manual cases and the browser smoke test below.

| ID | Test case | Use case | Preconditions / input | Expected result | Type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TC-FE-01 | formats money in the trip currency | UC-10 | `formatMoney(1842.5, "USD")`, `formatMoney(30000, "BDT", 0)`, `formatMoney(12, "EUR")` | `$1,842.50`, `৳30,000`, `€12.00` | Automated (Unit) | Pass |
| TC-FE-02 | formats date ranges like the design (Jun 16–22) | UC-09 | Ranges in the same month, across months, in another year and a single day | `Jun 16–22`, `Nov 28 – Dec 2`, `Jan 5–7, 2031`, `Mar 3` | Automated (Unit) | Pass |
| TC-FE-03 | counts days until a date and describes how long ago something happened | UC-09, UC-12 | `daysUntil` for a trip 12 days ahead and today; `timeAgo` for 30 s, 2 days and 2 weeks | `12`, `0`; "just now", "2 days ago", "2 weeks ago" | Automated (Unit) | Pass |
| TC-FE-04 | builds initials, distances and plurals | UC-03, UC-07 | Names, distances 0.4 / 2.345 / 42.7 km, counts 1 and 2418 | `MN`, `S`; `400 m`, `2.3 km`, `43 km`; "1 review", "2,418 reviews" | Automated (Unit) | Pass |
| TC-FE-05 | draws the spending donut from category percentages | UC-10 | Accommodation 75 %, Food 25 %; then no spending | A conic gradient with the category colours; a grey ring when empty | Automated (Unit) | Pass |
| TC-FE-06 | explains the budget status in words | UC-10 | Summaries with status warning, over, on-track with and without spending | "Careful — only $200 left.", "You're $50 over budget.", "No expenses yet…", "You're doing well. $200 remaining." | Automated (Unit) | Pass |
| TC-FE-07 | opens the next upcoming trip first | UC-09 | Three trips and different "today" dates; an empty list | The ongoing or next upcoming trip; the most recent trip when all are past; nothing for no trips | Automated (Unit) | Pass |
| TC-FE-08 | builds query strings and skips empty values | UC-04 | `api.destinations.list` with text, two categories, an empty region list and an undefined rating | Request URL `/api/destinations?q=beach&category=Beach%2CNature&page=2` | Automated (Unit) | Pass |
| TC-FE-09 | sends the saved token and a JSON body | UC-02, UC-13 | Token saved; post a review | `POST` with `Authorization: Bearer <token>` and the review as JSON | Automated (Unit) | Pass |
| TC-FE-10 | turns API errors into ApiError with field details | UC-01 | Server answers 400 with field details | `ApiError` with status 400 and the `details` map | Automated (Unit) | Pass |
| TC-FE-11 | reports when the server cannot be reached | — | `fetch` rejects (network error) | `ApiError` with status 0 and "Cannot reach the Tripza server…" | Automated (Unit) | Pass |
| TC-FE-12 | shows field errors accessibly | Feature h | Render a field with an error | The input has `aria-invalid="true"` and the message is shown | Automated (Component) | Pass |
| TC-FE-13 | renders star ratings and lets the user pick one | UC-12, UC-13 | Render `Stars` (4.4) and `StarSelect` (2); click 5 stars | Read-only stars are labelled "4.4 out of 5 stars"; 2 stars is checked; clicking 5 reports 5 | Automated (Component) | Pass |
| TC-FE-14 | closes dialogs with Escape, the close button or the backdrop | Feature h | Open a modal; press Escape; click Close | The first field gets focus; `close` is called once for each action | Automated (Component) | Pass |
| TC-FE-15 | shows the destination summary and opens its details | UC-04, UC-05 | Render a destination card; click it | Name, location, rating and tag are shown; clicking opens the details page | Automated (Component) | Pass |
| TC-FE-16 | asks guests to log in before saving a favorite | UC-11 | As a guest click the heart on a card | The login page opens and the toast "Log in to save your favorite places" is shown | Automated (Component) | Pass |
| TC-FE-17 | validates input before contacting the server | UC-01, UC-02 | `validateAuthForm` with bad login and register input, then valid input | The expected field messages; no errors for valid input | Automated (Unit) | Pass |
| TC-FE-18 | shows errors and does not submit an empty login form | UC-02 | Submit the empty login form | The email error is shown and no request is sent | Automated (Component) | Pass |
| TC-FE-19 | logs in with the demo account and returns to the requested page | UC-02 | Open `/login?next=/expenses`; click "Demo traveler"; log in (API mocked) | The form is filled with the demo email; `POST /api/auth/login` is sent; the Expenses page opens with "Welcome back, Alex!" | Automated (Component) | Pass |
| TC-FE-20 | shows the server's message when login fails | UC-02 | API answers 401 | An alert shows "Invalid email or password" | Automated (Component) | Pass |
| TC-FE-21 | switches between log in and sign up | UC-01 | Click "Create an account" | The sign-up heading and the Full name field are shown | Automated (Component) | Pass |

**Frontend automated: 21 / 21 passing (2026-10-30)** — files: `src/utils/utils.test.ts`, `src/api/client.test.ts`, `src/components/components.test.tsx`, `src/pages/AuthPage.test.tsx`.

### Browser smoke test

On 2026-10-30 the production build was opened in headless Chrome against the seeded backend (live APIs on). All routes loaded with no console errors and no failed API calls at 1280 px and 390 px widths. These flows were exercised end to end: demo traveler login from the login form, route planning from "Dhaka" to Sajek Valley (geocoding suggestion → OpenStreetMap route drawn on the map), adding an expense from the Expenses page, the admin dashboard as admin, the "Admins only" message for a traveler, and the 404 page. The manual cases above are still marked "To run" so the team can execute and sign them off.

---

## Traceability matrix

| Use case | Automated backend tests | Frontend automated tests | Manual UI tests | Non-functional tests |
| --- | --- | --- | --- | --- |
| UC-01 Register account | TC-AUTH-01, TC-AUTH-02, TC-AUTH-03, TC-UNIT-10, TC-UNIT-11 | TC-FE-10, TC-FE-17, TC-FE-21 | TC-UI-05, TC-UI-06 | TC-NF-06 |
| UC-02 Log in and log out | TC-AUTH-04, TC-AUTH-05, TC-AUTH-06, TC-AUTH-07 | TC-FE-09, TC-FE-17, TC-FE-18, TC-FE-19, TC-FE-20 | TC-UI-07, TC-UI-08, TC-UI-09 | TC-NF-07 |
| UC-03 Manage profile and password | TC-USER-01, TC-USER-02, TC-USER-03, TC-UNIT-12 | TC-FE-04 | TC-UI-27 | TC-NF-06 |
| UC-04 Search and filter destinations | TC-DEST-01, TC-DEST-02, TC-DEST-03, TC-DEST-04 | TC-FE-08, TC-FE-15 | TC-UI-01, TC-UI-02, TC-UI-03, TC-UI-10, TC-UI-11 | — |
| UC-05 View destination details | TC-DEST-05, TC-WEA-01, TC-NEAR-01, TC-REV-01 | TC-FE-15 | TC-UI-12, TC-UI-13, TC-UI-14 | TC-NF-04 |
| UC-06 Plan route and start navigation | TC-NAV-01, TC-NAV-02, TC-NAV-03, TC-NAV-04, TC-UNIT-07, TC-UNIT-08, TC-UNIT-09 | — | TC-UI-15, TC-UI-16, TC-UI-17 | TC-NF-04, TC-NF-05 |
| UC-07 Find nearby places | TC-NEAR-01, TC-NEAR-02, TC-NEAR-03, TC-NEAR-04, TC-NEAR-05, TC-NEAR-06, TC-FAV-03, TC-UNIT-07, TC-UNIT-08 | TC-FE-04 | TC-UI-18, TC-UI-19, TC-UI-20 | TC-NF-04, TC-NF-05 |
| UC-08 Check weather | TC-WEA-01, TC-WEA-02, TC-WEA-03, TC-UNIT-04, TC-UNIT-05, TC-UNIT-06, TC-UNIT-08 | — | TC-UI-21 | TC-NF-04, TC-NF-05 |
| UC-09 Create and manage trip budget | TC-TRIP-01, TC-TRIP-02, TC-TRIP-03, TC-TRIP-04, TC-TRIP-05, TC-TRIP-06, TC-UNIT-01, TC-UNIT-12 | TC-FE-02, TC-FE-03, TC-FE-07 | TC-UI-22 | — |
| UC-10 Record, edit and delete expenses and view summary | TC-EXP-01, TC-EXP-02, TC-EXP-03, TC-EXP-04, TC-TRIP-04, TC-TRIP-05, TC-UNIT-01, TC-UNIT-02, TC-UNIT-03, TC-UNIT-12 | TC-FE-01, TC-FE-05, TC-FE-06 | TC-UI-23, TC-UI-24 | — |
| UC-11 Save and remove favorites | TC-FAV-01, TC-FAV-02, TC-FAV-03, TC-FAV-04, TC-FAV-05, TC-FAV-06, TC-DEST-08 | TC-FE-16 | TC-UI-13, TC-UI-20, TC-UI-25 | — |
| UC-12 Read reviews and ratings | TC-REV-01, TC-REV-08 | TC-FE-03, TC-FE-13 | TC-UI-26 | — |
| UC-13 Write, edit and delete own review | TC-REV-02, TC-REV-03, TC-REV-04, TC-REV-05, TC-REV-06, TC-REV-08 | TC-FE-09, TC-FE-13 | TC-UI-26 | — |
| UC-14 Subscribe to newsletter | TC-SYS-02 | — | TC-UI-04 | — |
| UC-15 Manage destinations (admin) | TC-DEST-06, TC-DEST-07, TC-DEST-08, TC-SYS-03, TC-UNIT-12 | — | TC-UI-28 | — |
| UC-16 Moderate reviews (admin) | TC-REV-07 | — | TC-UI-29 | — |
| Cross-cutting (health, errors, security, navigation) | TC-SYS-01, TC-SYS-04, TC-SYS-05 | TC-FE-11, TC-FE-12, TC-FE-14 | TC-UI-30 | TC-NF-01 to TC-NF-03, TC-NF-08, TC-NF-09 |

Every automated test (backend and frontend), manual UI case and non-functional case appears at least once in this matrix, and every use case has at least one automated and one manual test.

---

## Results summary

**Backend automated: 72 / 72 passing (2026-10-30)** · **Frontend automated: 21 / 21 passing (2026-10-30)**

Command: `cd backend && npm test` (Node.js test runner: 72 tests in 14 suites, 0 failed, 0 skipped, about 5.5 s against PostgreSQL 17 in Docker).

| Suite | File | Tests | Passed | Failed |
| --- | --- | --- | --- | --- |
| Authentication API | `auth.test.js` | 7 | 7 | 0 |
| User profile API | `auth.test.js` | 3 | 3 | 0 |
| Destination exploration API | `destinations.test.js` | 8 | 8 | 0 |
| Bookmarks / favorites API | `favorites.test.js` | 6 | 6 | 0 |
| Nearby places API | `location.test.js` | 6 | 6 | 0 |
| Weather API | `location.test.js` | 3 | 3 | 0 |
| Location & navigation API | `location.test.js` | 4 | 4 | 0 |
| Reviews and feedback API | `reviews.test.js` | 8 | 8 | 0 |
| System, newsletter and admin API | `system.test.js` | 5 | 5 | 0 |
| Expense tracker API (trips and expenses) | `trips.test.js` | 10 | 10 | 0 |
| BudgetService, WeatherService, Geo and routing helpers, Request validation | `unit.test.js` | 12 | 12 | 0 |
| **Total** | | **72** | **72** | **0** |

| Category | Cases | Status |
| --- | --- | --- |
| Backend automated (unit + API) | 72 | 72 passing |
| Frontend automated (unit + component) | 21 (TC-FE-01 to TC-FE-21) | 21 passing |
| Manual UI | 30 (TC-UI-01 to TC-UI-30) | To run |
| Non-functional | 9 (TC-NF-01 to TC-NF-09) | 1 passing (TC-NF-09), 8 to run |
