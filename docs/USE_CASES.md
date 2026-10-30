# Use Case Specifications

*Tripza – Group No-02, Team CodeCrafters · CSE0613316 Software Project Design & Development Lab · [Back to README](../README.md)*

This document specifies the use cases of **Tripza – A Tourism and Travel Exploration System**. Each use case is traced to a feature in the project proposal (a–h), to the REST API endpoints that implement it, and to the test cases in [TEST_CASES.md](TEST_CASES.md). The use case diagram is in [UML_DIAGRAMS.md](UML_DIAGRAMS.md#1-use-case-diagram).

## Contents

- [Actors](#actors)
- [Proposal features](#proposal-features)
- [Use case summary](#use-case-summary)
- [Detailed specifications](#detailed-specifications)
  - [UC-01 Register account](#uc-01-register-account)
  - [UC-02 Log in and log out](#uc-02-log-in-and-log-out)
  - [UC-03 Manage profile and password](#uc-03-manage-profile-and-password)
  - [UC-04 Search and filter destinations](#uc-04-search-and-filter-destinations)
  - [UC-05 View destination details](#uc-05-view-destination-details)
  - [UC-06 Plan route and start navigation](#uc-06-plan-route-and-start-navigation)
  - [UC-07 Find nearby places](#uc-07-find-nearby-places)
  - [UC-08 Check weather](#uc-08-check-weather)
  - [UC-09 Create and manage trip budget](#uc-09-create-and-manage-trip-budget)
  - [UC-10 Record, edit and delete expenses and view summary](#uc-10-record-edit-and-delete-expenses-and-view-summary)
  - [UC-11 Save and remove favorites](#uc-11-save-and-remove-favorites)
  - [UC-12 Read reviews and ratings](#uc-12-read-reviews-and-ratings)
  - [UC-13 Write, edit and delete own review](#uc-13-write-edit-and-delete-own-review)
  - [UC-14 Subscribe to newsletter](#uc-14-subscribe-to-newsletter)
  - [UC-15 Manage destinations (admin)](#uc-15-manage-destinations-admin)
  - [UC-16 Moderate reviews (admin)](#uc-16-moderate-reviews-admin)

---

## Actors

| Actor | Type | Description |
| --- | --- | --- |
| Guest | Primary, human | Any visitor who is not logged in. Can explore destinations, routes, nearby places, weather and reviews, register, log in and subscribe to the newsletter. |
| Traveler | Primary, human | A registered user (role `user`). Inherits all Guest use cases and can also manage trips, budgets, expenses, favorites, reviews and their profile. |
| Admin | Primary, human | A registered user with role `admin`. Inherits all Traveler use cases and can also manage destinations, view statistics and remove reviews. |
| Open-Meteo | Secondary, external system | Weather forecasts (`api.open-meteo.com`). |
| OSRM routing | Secondary, external system | Road and walking routes (`routing.openstreetmap.de`). |
| Nominatim | Secondary, external system | Address and place search for the route starting point (`nominatim.openstreetmap.org`). |
| Overpass API | Secondary, external system | Live OpenStreetMap places, used only when Tripza has no curated places in range (`overpass-api.de`). |
| Google Maps | Secondary, external system | Receives the "Start navigation" deep link for turn-by-turn directions. |
| Browser geolocation | Secondary, device service | Supplies the user's coordinates for "use my location" and "near me", with the user's permission. |

All external services are keyless. When `LIVE_APIS=false`, or when a call fails or times out, the backend uses its offline fallback, so every use case still completes.

## Proposal features

| Code | Feature (from the proposal) | Use cases |
| --- | --- | --- |
| a | Tourist Destination Exploration | UC-04, UC-05, UC-15 |
| b | Location and Navigation | UC-05, UC-06 |
| c | Nearby Places | UC-07 |
| d | Weather Information | UC-08 |
| e | Expense Tracker | UC-09, UC-10 |
| f | Bookmark/Favorite | UC-11 |
| g | Reviews and Feedback | UC-12, UC-13, UC-16 |
| h | User-Friendly Interface | UC-01, UC-02, UC-03, UC-14, and the non-functional tests TC-NF-01 to TC-NF-03 |

## Use case summary

| ID | Name | Primary actor | Feature | Frontend route |
| --- | --- | --- | --- | --- |
| UC-01 | Register account | Guest | h | `/register` |
| UC-02 | Log in and log out | Guest, Traveler | h | `/login`, `/profile` |
| UC-03 | Manage profile and password | Traveler | h | `/profile` |
| UC-04 | Search and filter destinations | Guest | a | `/`, `/explore` |
| UC-05 | View destination details | Guest | a, b | `/destinations/:slug` |
| UC-06 | Plan route and start navigation | Guest | b | `/route?to=<slug>` |
| UC-07 | Find nearby places | Guest | c | `/nearby?destination=<slug>` |
| UC-08 | Check weather | Guest | d | `/weather?destination=<slug>` |
| UC-09 | Create and manage trip budget | Traveler | e | `/expenses` |
| UC-10 | Record, edit and delete expenses and view summary | Traveler | e | `/expenses?trip=<id>` |
| UC-11 | Save and remove favorites | Traveler | f | `/destinations/:slug`, `/nearby`, `/favorites` |
| UC-12 | Read reviews and ratings | Guest | g | `/reviews?destination=<slug>` |
| UC-13 | Write, edit and delete own review | Traveler | g | `/reviews?destination=<slug>` |
| UC-14 | Subscribe to newsletter | Guest | h | footer on every page |
| UC-15 | Manage destinations (admin) | Admin | a | `/admin` |
| UC-16 | Moderate reviews (admin) | Admin | g | `/reviews?destination=<slug>` |

---

## Detailed specifications

### UC-01 Register account

| Field | Details |
| --- | --- |
| **Actors** | Guest (primary) |
| **Description** | A guest creates a Tripza account so they can use personal features such as trip budgets, favorites and reviews. |
| **Preconditions** | The guest is not logged in. |
| **Postconditions** | A user with role `user` exists, the password is stored only as a bcrypt hash, and the guest is now logged in as a Traveler. |
| **Related API endpoints** | `POST /api/auth/register` |
| **Related test cases** | TC-AUTH-01, TC-AUTH-02, TC-AUTH-03, TC-UNIT-10, TC-UNIT-11, TC-UI-05, TC-UI-06, TC-NF-06 |

**Main success scenario**

1. The guest opens `/register`.
2. The guest enters name, email and password; they can toggle show/hide password.
3. The web app checks the fields and sends `POST /api/auth/register`.
4. The system validates the input: name 2–60 characters, a valid email, password 8–72 characters with at least one letter and one number.
5. The system checks that no account uses the email (case-insensitive).
6. The system hashes the password with bcrypt and stores the user with role `user`.
7. The system returns `201` with a JWT and the public profile (never the password hash).
8. The web app stores the token and shows the guest as logged in.

**Alternative and exception flows**

- 4a. One or more fields are invalid: the system returns `400` with a message per field; the form highlights them and the guest corrects them (back to step 2).
- 5a. The email is already registered: the system returns `409` "An account with this email already exists"; the form shows the error on the email field and the guest can log in instead (UC-02).

### UC-02 Log in and log out

| Field | Details |
| --- | --- |
| **Actors** | Guest (log in), Traveler or Admin (log out) |
| **Description** | A registered user signs in with email and password to receive a JWT, and later signs out. |
| **Preconditions** | Log in: the user has an account and is not logged in. Log out: the user is logged in. |
| **Postconditions** | Log in: the web app holds a valid token and sends it as `Authorization: Bearer <token>`. Log out: the token is removed from the web app. |
| **Related API endpoints** | `POST /api/auth/login`, `GET /api/auth/me` |
| **Related test cases** | TC-AUTH-04, TC-AUTH-05, TC-AUTH-06, TC-AUTH-07, TC-UI-07, TC-UI-08, TC-UI-09, TC-NF-07 |

**Main success scenario (log in)**

1. The guest opens `/login`, or is sent there after opening a page that needs login.
2. The guest enters email and password, or clicks a "use demo account" button that fills in a demo traveler or admin account.
3. The web app sends `POST /api/auth/login`.
4. The system finds the user by email and compares the password with the stored bcrypt hash.
5. The system returns `200` with a JWT (payload: user id and role; default lifetime 7 days) and the public profile.
6. The web app stores the token; when the app is reopened it restores the session with `GET /api/auth/me`.

**Main success scenario (log out)**

7. The traveler clicks "Log out" on the profile page.
8. The web app deletes the stored token and user and returns to a public page.

**Alternative and exception flows**

- 4a. The email is unknown or the password is wrong: the system returns `401` "Invalid email or password" (the same message in both cases, so registered emails cannot be discovered).
- 6a. The token is missing, invalid or expired on a protected request: the system returns `401` ("Your session has expired. Please log in again." when a token was sent); the web app clears the session and shows the login page.
- 8a. Because JWTs are stateless there is no server call on log out; a copied token stays valid until it expires.

### UC-03 Manage profile and password

| Field | Details |
| --- | --- |
| **Actors** | Traveler (primary) |
| **Description** | The traveler views their profile and activity counts, edits their profile and changes their password. |
| **Preconditions** | The traveler is logged in. |
| **Postconditions** | The profile shows the new values; after a password change the new password is needed for the next login. |
| **Related API endpoints** | `GET /api/users/me`, `PUT /api/users/me`, `PUT /api/users/me/password`, `GET /api/trips` |
| **Related test cases** | TC-USER-01, TC-USER-02, TC-USER-03, TC-UNIT-12, TC-UI-27, TC-NF-06 |

**Main success scenario**

1. The traveler opens `/profile`.
2. The system returns the public profile and statistics (number of trips, favorites and reviews); the page also lists upcoming trips and activity shortcuts.
3. The traveler selects "Edit profile", changes name (2–60 characters), location (up to 80) and bio (up to 280), and saves.
4. The system validates only the sent fields and returns the updated profile.
5. The traveler selects "Change password" and enters the current and the new password.
6. The system checks the current password, stores a bcrypt hash of the new one and returns "Password updated".

**Alternative and exception flows**

- 4a. A field is invalid (for example a one-letter name): `400` with field details.
- 4b. Location or bio is sent empty: the value is cleared (stored as `null`).
- 6a. The current password is wrong: `401` "Current password is incorrect"; nothing changes.
- 6b. The new password is too weak: `400` with the password rule.

### UC-04 Search and filter destinations

| Field | Details |
| --- | --- |
| **Actors** | Guest (primary); also Traveler and Admin |
| **Description** | The visitor finds destinations by text and narrows the list with filters and a sort order. |
| **Preconditions** | None. |
| **Postconditions** | None (read only). |
| **Related API endpoints** | `GET /api/destinations`, `GET /api/destinations/meta` |
| **Related test cases** | TC-DEST-01, TC-DEST-02, TC-DEST-03, TC-DEST-04, TC-UI-01, TC-UI-02, TC-UI-03, TC-UI-10, TC-UI-11 |

**Main success scenario**

1. The visitor types in the home page hero search, clicks a category chip, or opens `/explore`.
2. The web app loads the filter options from `GET /api/destinations/meta` (categories, regions, budget bands, sort options).
3. The visitor enters a search term and/or selects category, region, budget band (Under $500, $500 – $1,500, $1,500+), minimum rating and sort order (recommended, rating, popular, price low to high, price high to low, name, newest).
4. The web app calls `GET /api/destinations` with `q`, `category`, `region`, `budget`, `minRating`, `sort`, `page` and `limit`.
5. The system searches name, location, country, category and tag, applies the filters, calculates each destination's average rating and review count, sorts, and returns one page (12 items by default, at most 50).
6. The web app shows the result cards and the total result count.
7. The visitor clicks "Load more" and the web app requests the next page.

**Alternative and exception flows**

- 4a. An unknown sort option is sent: `400`. Unknown category, region or budget values are ignored.
- 5a. Nothing matches: the system returns `total: 0` and the page shows a result count of 0.

### UC-05 View destination details

| Field | Details |
| --- | --- |
| **Actors** | Guest (primary) |
| **Description** | The visitor opens a destination to see its description, photos, practical information, location and related information. |
| **Preconditions** | The visitor has chosen a destination (for example from Explore or Home). |
| **Postconditions** | None (read only). |
| **Related API endpoints** | `GET /api/destinations/:idOrSlug`, `GET /api/weather?destination=`, `GET /api/nearby?destination=`, `GET /api/reviews?destination=`, `GET /api/favorites` (when logged in) |
| **Related test cases** | TC-DEST-05, TC-WEA-01, TC-NEAR-01, TC-REV-01, TC-UI-12, TC-UI-13, TC-UI-14, TC-NF-04 |

**Main success scenario**

1. The visitor opens `/destinations/:slug`.
2. The web app calls `GET /api/destinations/:slug`; the system returns the destination with gallery, best time to visit, entry fee, opening hours, how to get there, local tip, coordinates, estimated cost, average rating and review count.
3. The web app loads the live weather, the top three nearby places and the latest review for the destination in parallel.
4. The page shows the gallery, quick facts, a Leaflet map with the destination marker, the weather card, nearby places, the latest review and the local tip.
5. From here the visitor can save the destination (UC-11), get directions (UC-06), see all reviews (UC-12), open nearby places (UC-07) or weather (UC-08), or follow "plan a trip budget" (UC-09).

**Alternative and exception flows**

- 2a. The slug or id does not exist: `404` "Destination not found"; the web app shows a not-found message.
- 3a. Live weather or OpenStreetMap is unavailable: the widgets show the offline fallback data (see UC-07 and UC-08).

### UC-06 Plan route and start navigation

| Field | Details |
| --- | --- |
| **Actors** | Guest (primary); OSRM routing, Nominatim, Google Maps, browser geolocation (secondary) |
| **Description** | The visitor gets the distance, travel time and path from a starting point to a destination for car, bus or walking, and can hand off to Google Maps. |
| **Preconditions** | A destination is selected (`/route?to=<slug>`, usually from "Get directions"). |
| **Postconditions** | Nothing is stored. |
| **Related API endpoints** | `GET /api/navigation/geocode?q=`, `GET /api/navigation/route?from=&destination=&mode=` (or `to=lat,lng`) |
| **Related test cases** | TC-NAV-01, TC-NAV-02, TC-NAV-03, TC-NAV-04, TC-UNIT-07, TC-UNIT-08, TC-UNIT-09, TC-UI-15, TC-UI-16, TC-UI-17, TC-NF-04, TC-NF-05 |

**Main success scenario**

1. The visitor opens `/route?to=<slug>`; the destination is shown on the map.
2. The visitor types a starting point (at least 2 characters); the web app calls `GET /api/navigation/geocode`.
3. The system returns matching Tripza destinations first and then OpenStreetMap Nominatim results (at most 8).
4. The visitor picks a result, or clicks "use my location" and allows the browser to share their coordinates.
5. The visitor selects a travel mode tab: car, bus or walk.
6. The web app calls `GET /api/navigation/route?from=<lat,lng>&destination=<slug>&mode=<mode>`.
7. The system asks OSRM for a road route (driving profile for car and bus, foot profile for walking; bus time is multiplied by 1.35 for stops).
8. The system returns distance, duration (minutes and text such as "1 hr 18 min"), the path, notes (distance, main road, bus note, data source) and a Google Maps directions URL.
9. The web app draws the route line and shows the route card.
10. The visitor clicks "Start navigation" and Google Maps opens with origin, destination and travel mode filled in.

**Alternative and exception flows**

- 3a. Nominatim fails or live APIs are off: only Tripza destinations are suggested.
- 4a. The browser denies location access: the visitor searches for a starting point instead.
- 6a. The starting point is missing or invalid, or the mode is not car, bus or walk: `400`. The destination does not exist: `404`.
- 7a. OSRM fails, times out (8 s) or live APIs are off: the system estimates the route as the straight-line distance times 1.3 at average speeds (car 45 km/h, bus 30 km/h, walk 4.8 km/h) and marks it "Estimated route".

### UC-07 Find nearby places

| Field | Details |
| --- | --- |
| **Actors** | Guest (primary); Overpass API, browser geolocation (secondary) |
| **Description** | The visitor finds restaurants, hospitals, hotels, shopping, ATMs and other useful places around a destination or their own location. |
| **Preconditions** | A destination is selected, or the visitor allows location access. |
| **Postconditions** | Nothing is stored (saving a place is UC-11). |
| **Related API endpoints** | `GET /api/nearby?destination=` or `?lat=&lng=` with `category`, `sort`, `radius`, `limit`; `GET /api/places/:id` |
| **Related test cases** | TC-NEAR-01, TC-NEAR-02, TC-NEAR-03, TC-NEAR-04, TC-NEAR-05, TC-NEAR-06, TC-FAV-03, TC-UNIT-07, TC-UNIT-08, TC-UI-18, TC-UI-19, TC-UI-20, TC-NF-04, TC-NF-05 |

**Main success scenario**

1. The visitor opens `/nearby?destination=<slug>`, or chooses "near me" and allows the browser to share their location.
2. The visitor selects a category tab (Restaurants, Hospitals, Hotels, Shopping, ATMs, Others) and a sort order (nearest or top rated).
3. The web app calls `GET /api/nearby` with the location, category and sort.
4. The system finds Tripza's curated places within the radius (5 km by default, 0.5–50 km), calculates each distance, and sorts by distance or rating (at most 20 by default, 50 maximum).
5. The system returns the centre, radius, places with `distanceKm`, the total and `source: "tripza"`.
6. The web app shows the list and the map markers.
7. The visitor can save a place (UC-11) or open directions to it.

**Alternative and exception flows**

- 1a. The browser denies location access: the visitor chooses a destination instead.
- 3a. No location is given or the coordinates are invalid: `400`. The category is unknown: `400`. The destination does not exist: `404`.
- 4a. No curated place is in range and live APIs are on: the system queries the Overpass API (radius capped at 10 km) and returns OpenStreetMap places with `source: "openstreetmap"`. These have no rating and no Tripza id, so they cannot be saved as favorites.
- 4b. The Overpass call fails or times out (9 s): the system returns an empty list with `source: "tripza"`.

### UC-08 Check weather

| Field | Details |
| --- | --- |
| **Actors** | Guest (primary); Open-Meteo, browser geolocation (secondary) |
| **Description** | The visitor sees the current weather, a 7-day forecast and a travel suggestion for a destination or their location. |
| **Preconditions** | A destination is selected, or the visitor allows location access. |
| **Postconditions** | A live forecast is cached in memory for 10 minutes. |
| **Related API endpoints** | `GET /api/weather?destination=` or `?lat=&lng=&name=` |
| **Related test cases** | TC-WEA-01, TC-WEA-02, TC-WEA-03, TC-UNIT-04, TC-UNIT-05, TC-UNIT-06, TC-UNIT-08, TC-UI-21, TC-NF-04, TC-NF-05 |

**Main success scenario**

1. The visitor opens `/weather?destination=<slug>` (or the weather card on the destination page).
2. The web app calls `GET /api/weather?destination=<slug>`.
3. The system resolves the coordinates and looks for a cached forecast for that point (coordinates rounded to 2 decimals, 10-minute lifetime).
4. On a cache miss the system requests the current conditions and a 7-day forecast from Open-Meteo.
5. The system turns weather codes into conditions and icons and derives a travel suggestion: alert for thunderstorms; caution for rain, a rain chance of 60% or more, 35 °C or hotter, 5 °C or colder, or wind of 40 km/h or more; otherwise good.
6. The system returns location, current conditions, today, 7 daily forecasts, the suggestion, the data source and the time fetched.
7. The web app shows the current conditions, the 7-day forecast and the suggestion.
8. The visitor uses "change location" to pick another destination or their own location, and the flow repeats from step 2.

**Alternative and exception flows**

- 2a. No location or invalid coordinates: `400`. Unknown destination: `404`.
- 4a. Open-Meteo fails or live APIs are off: the system returns a deterministic simulated forecast with `source: "simulated"`; it is not cached.

### UC-09 Create and manage trip budget

| Field | Details |
| --- | --- |
| **Actors** | Traveler (primary) |
| **Description** | The traveler creates a trip with dates, a budget and a currency, and later edits or deletes it. |
| **Preconditions** | The traveler is logged in. |
| **Postconditions** | The trip is stored for this traveler only; deleting it also deletes its expenses. |
| **Related API endpoints** | `GET /api/trips`, `POST /api/trips`, `GET /api/trips/:id`, `PUT /api/trips/:id`, `DELETE /api/trips/:id` |
| **Related test cases** | TC-TRIP-01, TC-TRIP-02, TC-TRIP-03, TC-TRIP-04, TC-TRIP-05, TC-TRIP-06, TC-UNIT-01, TC-UNIT-12, TC-UI-22 |

**Main success scenario**

1. The traveler opens `/expenses`, or follows "plan a trip budget" on a destination page.
2. The web app loads the traveler's trips with their budget summaries and fills the trip selector.
3. The traveler chooses to create a trip and enters name, destination (optional), start and end date, budget and currency (USD, BDT, EUR, GBP or INR; USD by default).
4. The web app sends `POST /api/trips`.
5. The system validates the trip (name 2–80 characters, dates as YYYY-MM-DD, end date not before start date, budget 0 or more, destination exists) and stores it.
6. The system returns `201` with the trip and its summary (number of days, nothing spent, remaining equal to the budget).
7. The web app selects the new trip (`/expenses?trip=<id>`) and shows the summary cards.
8. Later the traveler edits the trip (for example raises the budget); the system saves the changed fields and returns a recalculated summary.
9. The traveler may delete the trip; the system deletes it with all its expenses and returns `204`.

**Alternative and exception flows**

- 5a. The end date is before the start date: `400` with an error on `endDate`. The budget is negative: `400`.
- 5b. The selected destination does not exist: `404`.
- 8a. The trip does not exist or belongs to another traveler: `404` "Trip not found" (other travelers' trips are invisible).

### UC-10 Record, edit and delete expenses and view summary

| Field | Details |
| --- | --- |
| **Actors** | Traveler (primary) |
| **Description** | The traveler records categorised expenses for a trip and monitors total spending against the budget. |
| **Preconditions** | The traveler is logged in and owns at least one trip. |
| **Postconditions** | The expense list and the budget summary reflect the change. |
| **Related API endpoints** | `GET /api/trips/:id`, `GET /api/trips/:id/expenses?category=`, `POST /api/trips/:id/expenses`, `PUT /api/expenses/:id`, `DELETE /api/expenses/:id` |
| **Related test cases** | TC-EXP-01, TC-EXP-02, TC-EXP-03, TC-EXP-04, TC-TRIP-04, TC-TRIP-05, TC-UNIT-01, TC-UNIT-02, TC-UNIT-03, TC-UNIT-12, TC-UI-23, TC-UI-24 |

**Main success scenario**

1. The traveler selects a trip on `/expenses?trip=<id>`.
2. The web app loads the trip, its budget summary and its expenses with `GET /api/trips/:id`.
3. The traveler adds an expense: title, category (Transportation, Accommodation, Food, Shopping, Other), amount, date and an optional note.
4. The web app sends `POST /api/trips/:id/expenses`; the system validates and stores it and returns `201`.
5. The web app reloads the trip; the system recalculates the summary: total spent, remaining, percent used, status, trip days, days left, remaining allowance per day and spending per category.
6. The web app updates the three summary cards (budget, spent, remaining), the spending donut, the budget progress bar and the expense list.
7. The traveler edits an expense (only the changed fields are sent) or deletes it; the summary updates the same way.
8. The traveler filters the list by category.

**Alternative and exception flows**

- 4a. The amount is not positive, the category is unknown or the date is not YYYY-MM-DD: `400` with field details.
- 5a. Spending reaches 80% of the budget: status `warning`; spending goes above 100%: status `over` and the remaining amount is negative.
- 7a. The expense belongs to another traveler's trip or no longer exists: `404` "Expense not found".
- 8a. The filter category is unknown: `400`.

### UC-11 Save and remove favorites

| Field | Details |
| --- | --- |
| **Actors** | Traveler (primary) |
| **Description** | The traveler bookmarks destinations and nearby places for later and manages the saved list. |
| **Preconditions** | The traveler is logged in. |
| **Postconditions** | The item is in (or removed from) the traveler's favorites. |
| **Related API endpoints** | `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/:itemType/:itemId` |
| **Related test cases** | TC-FAV-01, TC-FAV-02, TC-FAV-03, TC-FAV-04, TC-FAV-05, TC-FAV-06, TC-DEST-08, TC-UI-13, TC-UI-20, TC-UI-25 |

**Main success scenario**

1. The traveler clicks Save on a destination page or on a nearby place.
2. The web app sends `POST /api/favorites` with `itemType` (`destination` or `place`) and `itemId`.
3. The system checks that the item exists and stores the bookmark; saving the same item twice has no effect.
4. The system returns `201` for a new bookmark or `200` if it was already saved; the button shows the saved state.
5. The traveler opens `/favorites`; the system returns saved destinations and places, newest first, and the tabs show their counts.
6. The traveler removes an item; the system deletes the bookmark (`204`) and the item disappears. When a tab has no items, an empty state is shown.

**Alternative and exception flows**

- 1a. A guest clicks Save: the API would return `401`, so the web app asks the guest to log in.
- 3a. The item does not exist: `404`. The item type is not `destination` or `place`: `400`.
- 6a. The item is not in the favorites: `404`.
- 6b. An admin deletes a destination: it is removed from every traveler's favorites automatically.

### UC-12 Read reviews and ratings

| Field | Details |
| --- | --- |
| **Actors** | Guest (primary) |
| **Description** | The visitor reads other travelers' reviews and the rating summary of a destination. |
| **Preconditions** | None. |
| **Postconditions** | None (read only). |
| **Related API endpoints** | `GET /api/reviews?destination=<slug>&page=&limit=`, `GET /api/reviews?mine=true` |
| **Related test cases** | TC-REV-01, TC-REV-08, TC-UI-26 |

**Main success scenario**

1. The visitor opens `/reviews?destination=<slug>` (for example from the destination page).
2. The web app calls `GET /api/reviews?destination=<slug>`.
3. The system returns the summary (average rating to one decimal, number of reviews, percentage of reviews for each star from 5 to 1) and the reviews, newest first, with the reviewer's name (10 per page by default).
4. The web app shows the rating summary, the distribution bars and the review list.

**Alternative and exception flows**

- 2a. The destination does not exist: `404`.
- 2b. A logged-in traveler can list only their own reviews with `?mine=true`; without a token this returns `401`.

### UC-13 Write, edit and delete own review

| Field | Details |
| --- | --- |
| **Actors** | Traveler (primary) |
| **Description** | The traveler rates a destination with 1–5 stars and a comment, and can later change or remove their review. |
| **Preconditions** | The traveler is logged in and the destination exists. |
| **Postconditions** | The review is stored; the destination's average rating and review count change immediately because they are calculated from the reviews. |
| **Related API endpoints** | `POST /api/reviews`, `PUT /api/reviews/:id`, `DELETE /api/reviews/:id`, `GET /api/reviews?mine=true` |
| **Related test cases** | TC-REV-02, TC-REV-03, TC-REV-04, TC-REV-05, TC-REV-06, TC-REV-08, TC-UI-26 |

**Main success scenario**

1. On the reviews page the traveler chooses to write a review.
2. The traveler selects a rating of 1–5 stars and writes a comment of 10–1000 characters, then submits.
3. The web app sends `POST /api/reviews` with `destinationId`, `rating` and `comment`.
4. The system validates the input, checks the destination exists and checks that the traveler has not reviewed it before.
5. The system stores the review and returns `201`.
6. The web app refreshes the list and summary; the new review appears and the average changes.
7. Later the traveler edits their review (rating and/or comment) or deletes it (`204`).

**Alternative and exception flows**

- 1a. A guest tries to write a review: the web app asks them to log in; the API returns `401` without a token.
- 4a. The rating is outside 1–5 or the comment is too short or too long: `400` with field details.
- 4b. The traveler already reviewed this destination: `409` "You have already reviewed this destination. Edit your existing review instead."
- 7a. The traveler tries to edit or delete someone else's review: `403` "You can only change your own reviews". The review no longer exists: `404`.

### UC-14 Subscribe to newsletter

| Field | Details |
| --- | --- |
| **Actors** | Guest (primary); also Traveler and Admin |
| **Description** | The visitor subscribes to the Tripza newsletter from the page footer. |
| **Preconditions** | None. |
| **Postconditions** | The email is stored once in `newsletter_subscribers`. |
| **Related API endpoints** | `POST /api/newsletter` |
| **Related test cases** | TC-SYS-02, TC-UI-04 |

**Main success scenario**

1. The visitor enters an email address in the footer sign-up form and submits.
2. The web app sends `POST /api/newsletter`.
3. The system validates the email and stores it.
4. The system returns `201` "You're subscribed!" and the web app shows the message.

**Alternative and exception flows**

- 3a. The email is invalid: `400` with a field error.
- 3b. The email is already subscribed (in any letter case): `200` "You're already subscribed."

### UC-15 Manage destinations (admin)

| Field | Details |
| --- | --- |
| **Actors** | Admin (primary) |
| **Description** | The admin views site statistics and adds, edits and deletes destinations. |
| **Preconditions** | The user is logged in with role `admin`. |
| **Postconditions** | The destination catalogue reflects the change. A new destination gets a unique slug generated from its name. |
| **Related API endpoints** | `GET /api/admin/stats`, `GET /api/destinations`, `POST /api/destinations`, `PUT /api/destinations/:id`, `DELETE /api/destinations/:id` |
| **Related test cases** | TC-DEST-06, TC-DEST-07, TC-DEST-08, TC-SYS-03, TC-UNIT-12, TC-UI-28 |

**Main success scenario**

1. The admin opens `/admin`.
2. The web app shows statistics from `GET /api/admin/stats` (users, destinations, reviews, trips, newsletter subscribers) and a table of destinations.
3. The admin adds a destination and fills in name, location, country, region, category, description, image URL, latitude, longitude and estimated cost, plus optional tag, headline, gallery URLs, best time, entry fee, opening hours, how to get there and local tip.
4. The system validates the data, generates a unique slug from the name, stores the destination and returns `201`.
5. The admin edits a destination; only the changed fields are sent and validated, and renaming it regenerates the slug.
6. The admin deletes a destination; the system deletes it with its reviews and favorites, keeps places and trips but removes their link to it, and returns `204`.

**Alternative and exception flows**

- 1a. A traveler opens `/admin`: access is refused; the API returns `403` "Admin access required" (`401` if not logged in).
- 4a. The data is invalid (for example an unknown category, latitude above 90, or a non-http image URL): `400` with field details.
- 5a, 6a. The destination does not exist: `404`.

### UC-16 Moderate reviews (admin)

| Field | Details |
| --- | --- |
| **Actors** | Admin (primary) |
| **Description** | The admin removes inappropriate reviews written by any user. |
| **Preconditions** | The user is logged in with role `admin` and is viewing a review list (UC-12). |
| **Postconditions** | The review is deleted and the destination's rating summary no longer includes it. |
| **Related API endpoints** | `DELETE /api/reviews/:id` |
| **Related test cases** | TC-REV-07, TC-UI-29 |

**Main success scenario**

1. The admin opens the reviews of a destination.
2. The admin finds an inappropriate review and chooses to delete it.
3. The web app sends `DELETE /api/reviews/:id`.
4. The system allows the request because the user's role is `admin`, even though they are not the author, deletes the review and returns `204`.
5. The web app removes the review and refreshes the summary.

**Alternative and exception flows**

- 4a. The review no longer exists: `404`.
- 4b. Admins can only delete other users' reviews; editing them (`PUT /api/reviews/:id`) still returns `403`.
