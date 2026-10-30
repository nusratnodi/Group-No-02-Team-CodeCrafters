# UML Diagrams

*Tripza – Group No-02, Team CodeCrafters · CSE0613316 Software Project Design & Development Lab · [Back to README](../README.md)*

This document holds the behavioural and structural UML diagrams for **Tripza – A Tourism and Travel Exploration System**. The diagrams were drawn from the backend source code (`backend/src`, Node.js 22 + Express 5 + PostgreSQL via `pg`) and the planned React frontend routes. Class names, method names, endpoints and tables are the real ones from the code. Class diagrams are in [CLASS_DIAGRAM.md](CLASS_DIAGRAM.md), use case specifications are in [USE_CASES.md](USE_CASES.md), and test cases are in [TEST_CASES.md](TEST_CASES.md).

All diagrams use Mermaid, so GitHub renders them directly.

## Contents

1. [Use case diagram](#1-use-case-diagram)
2. [Activity diagrams](#2-activity-diagrams)
   - [2.1 Plan a trip end to end](#21-plan-a-trip-end-to-end)
   - [2.2 Record an expense](#22-record-an-expense)
3. [Sequence diagrams](#3-sequence-diagrams)
   - [3.1 Register an account](#31-register-an-account)
   - [3.2 Log in and call a protected endpoint with a JWT](#32-log-in-and-call-a-protected-endpoint-with-a-jwt)
   - [3.3 Explore and view a destination](#33-explore-and-view-a-destination)
   - [3.4 Nearby search with Overpass fallback](#34-nearby-search-with-overpass-fallback)
   - [3.5 Weather with caching and Open-Meteo fallback](#35-weather-with-caching-and-open-meteo-fallback)
   - [3.6 Route planning with OSRM fallback](#36-route-planning-with-osrm-fallback)
   - [3.7 Add an expense and refresh the budget summary](#37-add-an-expense-and-refresh-the-budget-summary)
   - [3.8 Write a review](#38-write-a-review)
4. [State machine diagrams](#4-state-machine-diagrams)
   - [4.1 Budget status](#41-budget-status)
   - [4.2 Trip lifecycle](#42-trip-lifecycle)
5. [Component diagram](#5-component-diagram)
6. [Deployment diagram](#6-deployment-diagram)
7. [Entity relationship diagram](#7-entity-relationship-diagram)

---

## 1. Use case diagram

Mermaid has no native use case diagram, so it is drawn as a flowchart: actors on the left, use cases (stadium shapes) inside the system boundary, and external systems on the right. Dashed arrows are `«include»` and `«extend»` relationships.

```mermaid
flowchart LR
    Admin["«actor»<br/>Admin"]
    Traveler["«actor»<br/>Traveler"]
    Guest["«actor»<br/>Guest"]

    subgraph System["Tripza system"]
        direction TB
        UC01(["UC-01 Register account"])
        UC02(["UC-02 Log in / log out"])
        UC03(["UC-03 Manage profile and password"])
        UC04(["UC-04 Search and filter destinations"])
        UC05(["UC-05 View destination details"])
        UC06(["UC-06 Plan route and navigate"])
        UC07(["UC-07 Find nearby places"])
        UC08(["UC-08 Check weather"])
        UC09(["UC-09 Create and manage trip budget"])
        UC10(["UC-10 Record expenses and view summary"])
        UC11(["UC-11 Save and remove favorites"])
        UC12(["UC-12 Read reviews and ratings"])
        UC13(["UC-13 Write, edit and delete own review"])
        UC14(["UC-14 Subscribe to newsletter"])
        UC15(["UC-15 Manage destinations"])
        UC16(["UC-16 Moderate reviews"])
        AUTH(["Authenticate with JWT"])
        GEO(["Search starting point"])
        LOC(["Use current location"])
        NAV(["Start navigation in Google Maps"])
    end

    OpenMeteo["«system»<br/>Open-Meteo"]
    OSRM["«system»<br/>OSRM routing"]
    Nominatim["«system»<br/>Nominatim"]
    Overpass["«system»<br/>Overpass API"]
    GMaps["«system»<br/>Google Maps"]

    Admin -->|"is a"| Traveler
    Traveler -->|"is a"| Guest

    Guest --- UC01
    Guest --- UC02
    Guest --- UC04
    Guest --- UC05
    Guest --- UC06
    Guest --- UC07
    Guest --- UC08
    Guest --- UC12
    Guest --- UC14
    Traveler --- UC03
    Traveler --- UC09
    Traveler --- UC10
    Traveler --- UC11
    Traveler --- UC13
    Admin --- UC15
    Admin --- UC16

    UC03 -.->|"«include»"| AUTH
    UC09 -.->|"«include»"| AUTH
    UC10 -.->|"«include»"| AUTH
    UC11 -.->|"«include»"| AUTH
    UC13 -.->|"«include»"| AUTH
    UC15 -.->|"«include»"| AUTH
    UC16 -.->|"«include»"| AUTH
    GEO -.->|"«extend»"| UC06
    LOC -.->|"«extend»"| UC06
    LOC -.->|"«extend»"| UC07
    LOC -.->|"«extend»"| UC08
    NAV -.->|"«extend»"| UC06
    UC13 -.->|"«extend»"| UC12
    UC16 -.->|"«extend»"| UC12

    UC08 --- OpenMeteo
    UC06 --- OSRM
    GEO --- Nominatim
    UC07 --- Overpass
    NAV --- GMaps

    classDef actor fill:#fff4e0,stroke:#d48806,color:#3d2a00
    classDef ext fill:#eeeeee,stroke:#777777,color:#222222
    class Guest,Traveler,Admin actor
    class OpenMeteo,OSRM,Nominatim,Overpass,GMaps ext
```

A Traveler can do everything a Guest can, and an Admin everything a Traveler can ("is a" arrows show actor generalisation). Every personal or admin use case includes JWT authentication, while the location helpers and Google Maps hand-off are optional extensions of the routing, nearby and weather use cases.

---

## 2. Activity diagrams

### 2.1 Plan a trip end to end

```mermaid
flowchart TD
    S((Start)) --> A1("Search a destination on Home or open Explore")
    A1 --> A2("Apply filters and sort, browse results")
    A2 --> A3("Open destination details")
    A3 --> A4("Check weather card and 7-day forecast")
    A4 --> D1{"Weather and cost suitable?"}
    D1 -->|No| A2
    D1 -->|Yes| D2{"Logged in?"}
    D2 -->|No| A5("Log in or register")
    A5 --> A6
    D2 -->|Yes| A6("Save destination to favorites")
    A6 --> A7("Create trip budget: name, dates, budget, currency")
    A7 --> A8("Open route planner with Get directions")
    A8 --> D3{"Use current location?"}
    D3 -->|Yes| A9("Browser shares coordinates")
    D3 -->|No| A10("Search starting point by name")
    A9 --> A11("Choose travel mode: car, bus or walk")
    A10 --> A11
    A11 --> A12("Review route: distance, duration, notes")
    A12 --> A13("Find nearby hotels, restaurants and ATMs")
    A13 --> D4{"Place worth keeping?"}
    D4 -->|Yes| A14("Save place to favorites")
    D4 -->|No| D5{"Start navigation now?"}
    A14 --> D5
    D5 -->|Yes| A15("Open Google Maps directions")
    D5 -->|No| E(((End)))
    A15 --> E
```

This is the main journey the proposal describes: discover a destination, check the weather, bookmark it, set a budget, plan the route and look up services around it. Login is only requested at the first step that stores personal data.

### 2.2 Record an expense

Blue nodes are traveler actions, green nodes are web app actions and orange nodes are API actions.

```mermaid
flowchart TD
    S((Start)) --> T1("Open Expenses page and select a trip")
    T1 --> T2("Enter title, category, amount, date and optional note")
    T2 --> W1{"Form fields valid?"}
    W1 -->|No| T3("Correct highlighted fields")
    T3 --> T2
    W1 -->|Yes| W2("POST /api/trips/:id/expenses with Bearer token")
    W2 --> A1{"Token valid?"}
    A1 -->|"No: 401"| W3("Clear session and show login page")
    W3 --> E(((End)))
    A1 -->|Yes| A2{"Trip exists and belongs to user?"}
    A2 -->|"No: 404"| W4("Show Trip not found")
    W4 --> E
    A2 -->|Yes| A3{"Body matches expenseSchema?"}
    A3 -->|"No: 400 with field details"| T3
    A3 -->|Yes| A4("Insert row into expenses")
    A4 --> W5("Reload trip with GET /api/trips/:id")
    W5 --> A5("summarizeBudget: totals, percent used, status, by category")
    A5 --> W6("Update summary cards, donut chart, progress bar and list")
    W6 --> T4("Review budget status: on-track, warning or over")
    T4 --> E

    classDef user fill:#e3f0ff,stroke:#2f6fdb,color:#0b2a5c
    classDef web fill:#e6f6ea,stroke:#2e8b57,color:#0f3d22
    classDef api fill:#fff1e0,stroke:#d9822b,color:#4a2700
    class T1,T2,T3,T4 user
    class W1,W2,W3,W4,W5,W6 web
    class A1,A2,A3,A4,A5 api
```

Validation happens twice: in the form for quick feedback and in the API (`validate(body, expenseSchema)`), which is the authority. The budget status is recalculated after every change rather than stored.

---

## 3. Sequence diagrams

### 3.1 Register an account

```mermaid
sequenceDiagram
    autonumber
    actor G as Guest
    participant FE as React app
    participant AR as Auth routes
    participant AS as AuthService
    participant UM as UserModel
    participant DB as PostgreSQL

    G->>FE: Fill in name, email and password, click Register
    FE->>AR: POST /api/auth/register
    AR->>AR: validate(body, registerSchema)
    alt invalid fields
        AR-->>FE: 400 with a message per field
        FE-->>G: Highlight fields
    else valid
        AR->>AS: register(name, email, password)
        AS->>UM: findByEmail(email)
        UM->>DB: SELECT from users by email, case-insensitive
        alt email already registered
            AS-->>AR: throw HttpError 409
            AR-->>FE: 409 Email is already registered
            FE-->>G: Show error on email field
        else new email
            AS->>AS: hashPassword(password) with bcrypt
            AS->>UM: create(name, email, passwordHash)
            UM->>DB: INSERT INTO users, role user
            AS->>AS: issueToken(user) signs sub and role, expires in 7d
            AS-->>AR: token and public user without password_hash
            AR-->>FE: 201 token, user
            FE->>FE: Store token in auth context
            FE-->>G: Logged in
        end
    end
```

Registration signs the user in straight away by returning a JWT. The password is hashed with bcrypt before storage and the response is built with `toPublicUser()`, so the hash never leaves the server.

### 3.2 Log in and call a protected endpoint with a JWT

```mermaid
sequenceDiagram
    autonumber
    actor U as Guest
    participant FE as React app
    participant AR as Auth routes
    participant MW as authenticate middleware
    participant UR as User routes
    participant AS as AuthService
    participant UM as UserModel

    U->>FE: Enter email and password, or click Use demo account
    FE->>AR: POST /api/auth/login
    AR->>AR: validate(body, loginSchema)
    AR->>AS: login(email, password)
    AS->>UM: findByEmail(email)
    AS->>AS: bcrypt.compare(password, password_hash)
    alt unknown email or wrong password
        AS-->>AR: throw HttpError 401
        AR-->>FE: 401 Invalid email or password
        FE-->>U: Show error, stay on login page
    else valid
        AS->>AS: issueToken(user)
        AS-->>AR: token and public user
        AR-->>FE: 200 token, user
        FE->>FE: Save token and user in auth context
    end
    Note over FE,UR: Later, any protected request
    FE->>MW: GET /api/users/me with header Authorization Bearer token
    MW->>AS: verifyToken(token)
    AS->>AS: jwt.verify with JWT_SECRET
    AS->>UM: findById(sub)
    alt token missing, invalid or expired
        MW-->>FE: 401 Your session has expired. Please log in again.
        FE->>FE: Clear session and open /login
    else valid
        MW->>UR: next() with req.user set
        UR->>UM: stats(userId)
        UR-->>FE: 200 user and stats
    end
    U->>FE: Click Log out
    FE->>FE: Remove stored token, no server call needed
```

The same message is returned for an unknown email and a wrong password, so attackers cannot find out which emails are registered. JWTs are stateless: the server only checks the signature and expiry (`JWT_EXPIRES_IN`, default 7 days), and logging out means the client discards the token.

### 3.3 Explore and view a destination

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitor
    participant FE as React app
    participant API as Tripza API routes
    participant DM as DestinationModel
    participant DB as PostgreSQL

    V->>FE: Open /explore
    FE->>API: GET /api/destinations/meta
    API-->>FE: categories, regions, budget bands, sort options
    V->>FE: Type a search, pick filters and a sort order
    FE->>API: GET /api/destinations?q=beach&category=Beach&budget=low&minRating=4&sort=rating
    API->>API: pagination(query), drop unknown filter values
    API->>DM: search(filters)
    DM->>DB: COUNT and SELECT with average rating per destination, ORDER BY, LIMIT, OFFSET
    DB-->>DM: rows
    DM-->>API: items and total
    API-->>FE: 200 items, total, page, limit, pages
    FE-->>V: Result cards and result count
    opt Load more
        FE->>API: Same query with page=2
        API-->>FE: Next page of items
    end
    V->>FE: Click a destination card
    FE->>API: GET /api/destinations/sajek-valley
    API->>DM: find("sajek-valley")
    DM->>DB: SELECT by slug with rating and review count
    alt not found
        API-->>FE: 404 Destination not found
        FE-->>V: Not-found message
    else found
        API-->>FE: 200 destination
        par Detail page widgets
            FE->>API: GET /api/weather?destination=sajek-valley
        and
            FE->>API: GET /api/nearby?destination=sajek-valley&sort=rating&limit=3
        and
            FE->>API: GET /api/reviews?destination=sajek-valley&limit=1
        end
        FE-->>V: Gallery, quick facts, map, weather, nearby places, latest review, local tip
    end
```

The rating and review count are never stored on the destination; they are calculated with a `LEFT JOIN` over `reviews` on every query, so they are always current. The detail page loads its widgets in parallel once the destination itself is known.

### 3.4 Nearby search with Overpass fallback

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitor
    participant FE as React app
    participant BG as Browser geolocation
    participant PR as Place routes
    participant NS as NearbyService
    participant PM as PlaceModel
    participant DB as PostgreSQL
    participant OP as Overpass API

    V->>FE: Open /nearby and choose the Restaurants tab
    opt Near me
        FE->>BG: getCurrentPosition()
        BG-->>FE: lat, lng
    end
    FE->>PR: GET /api/nearby?destination=coxs-bazar-sea-beach&category=restaurant&sort=distance
    PR->>PR: resolveLocation(), check category, clamp radius 0.5-50 km and limit 1-50
    PR->>NS: find(center, radiusKm, category, sort, limit)
    NS->>PM: findNear(center, options)
    PM->>DB: SELECT places inside the bounding box
    PM->>PM: haversineKm() per place, drop places outside the radius, sort
    PM-->>NS: curated places
    alt curated places found, or LIVE_APIS is false
        NS-->>PR: items, source tripza
    else none in range and live APIs on
        NS->>OP: POST /api/interpreter with OSM tags for the category, radius up to 10 km
        alt Overpass answers
            OP-->>NS: OSM elements
            NS->>NS: Map tags to Tripza categories, compute distance, sort nearest first
            NS-->>PR: items, source openstreetmap
        else error or 9 s timeout
            NS-->>PR: empty items, source tripza
        end
    end
    PR-->>FE: 200 center, radiusKm, items, total, source
    FE-->>V: List and map markers
```

Tripza's own curated places are always preferred; OpenStreetMap is only asked when there are none in range, and a failure there still returns an empty result instead of an error. Places from OpenStreetMap have ids such as `osm-node-123`, so they cannot be saved as favorites.

### 3.5 Weather with caching and Open-Meteo fallback

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitor
    participant FE as React app
    participant WR as Weather routes
    participant WS as WeatherService
    participant OM as Open-Meteo

    V->>FE: Open /weather?destination=sajek-valley
    FE->>WR: GET /api/weather?destination=sajek-valley
    WR->>WR: resolveLocation() gives lat, lng and name
    WR->>WS: getForecast(point, name)
    WS->>WS: Cache key from lat and lng rounded to 2 decimals
    alt cached result younger than 10 minutes
        WS->>WS: Reuse cached forecast
    else cache miss
        alt LIVE_APIS on
            WS->>OM: GET /v1/forecast with current and 7 daily values
            alt success
                OM-->>WS: Forecast JSON
                WS->>WS: describeWeather() for each WMO code, source open-meteo
                WS->>WS: Store result in cache
            else error or 6 s timeout
                WS->>WS: simulatedForecast(point), source simulated
            end
        else offline mode
            WS->>WS: simulatedForecast(point), source simulated
        end
    end
    WS->>WS: travelSuggestion(current, today)
    WS-->>WR: location, current, today, daily, suggestion, source, fetchedAt
    WR-->>FE: 200 forecast plus destination info
    FE-->>V: Current conditions, 7-day forecast, travel suggestion
```

Live results are cached in memory for 10 minutes per rounded coordinate (about 1 km), so repeated views of the same place do not call Open-Meteo again. Simulated forecasts are deterministic and never cached, so the live API is tried again on the next request.

### 3.6 Route planning with OSRM fallback

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitor
    participant FE as React app
    participant NR as Navigation routes
    participant GS as GeocodeService
    participant RS as RouteService
    participant NOM as Nominatim
    participant OSRM as OSRM routing
    participant GM as Google Maps

    V->>FE: Open /route?to=coxs-bazar-sea-beach and type Dhaka
    FE->>NR: GET /api/navigation/geocode?q=Dhaka
    NR->>GS: search("Dhaka")
    GS->>GS: Match Tripza destination names, up to 4
    opt LIVE_APIS on
        GS->>NOM: GET /search?q=Dhaka&format=json&limit=5
        NOM-->>GS: Matching places, errors ignored
    end
    GS-->>NR: Up to 8 results
    NR-->>FE: 200 results
    V->>FE: Pick a start point or Use my location, choose mode car
    FE->>NR: GET /api/navigation/route?from=23.81,90.41&to=21.426,91.9745&mode=car
    NR->>NR: Check mode, parseCoordinate(from), parseCoordinate(to)
    NR->>RS: getRoute(from, to, mode)
    alt LIVE_APIS on
        RS->>OSRM: GET routed-car or routed-foot route with both coordinates
        alt route found
            OSRM-->>RS: distance, duration, GeoJSON path, road summary
            RS->>RS: Bus time x 1.35, source openstreetmap
        else error or 8 s timeout
            RS->>RS: estimateRoute(): straight line x 1.3 at average speed
        end
    else offline mode
        RS->>RS: estimateRoute(), source estimate
    end
    RS->>RS: Build notes, durationText and navigationUrl
    RS-->>NR: route
    NR-->>FE: 200 route
    FE-->>V: Route line on map and route card
    V->>FE: Click Start navigation
    FE->>GM: Open google.com/maps/dir with origin, destination and travelmode
```

The fallback estimate uses the great-circle distance times 1.3 and average speeds of 45 km/h (car), 30 km/h (bus) and 4.8 km/h (walk), so the planner always gives an answer. Turn-by-turn navigation is handed to Google Maps through a deep link, which needs no API key.

### 3.7 Add an expense and refresh the budget summary

```mermaid
sequenceDiagram
    autonumber
    actor T as Traveler
    participant FE as React app
    participant MW as authenticate middleware
    participant TR as Trip routes
    participant TM as TripModel
    participant EM as ExpenseModel
    participant BS as BudgetService
    participant DB as PostgreSQL

    T->>FE: Fill in the expense form and click Add
    FE->>MW: POST /api/trips/7/expenses with Bearer token
    MW->>MW: AuthService.verifyToken(token)
    alt token missing or invalid
        MW-->>FE: 401
    else valid
        MW->>TR: next() with req.user
        TR->>TM: findById(7)
        alt trip missing or owned by another user
            TR-->>FE: 404 Trip not found
        else owner
            TR->>TR: validate(body, expenseSchema)
            alt invalid amount, category or date
                TR-->>FE: 400 with field details
            else valid
                TR->>EM: create(tripId, title, category, amount, spentOn, note)
                EM->>DB: INSERT INTO expenses
                TR-->>FE: 201 expense
                FE->>TR: GET /api/trips/7
                TR->>TM: findById(7)
                TR->>EM: listByTrip(7)
                TR->>BS: summarizeBudget(trip, expenses)
                BS-->>TR: totalSpent, remaining, percentUsed, status, perDayRemaining, byCategory
                TR-->>FE: 200 trip, summary, expenses
                FE-->>T: Updated cards, donut chart, progress bar and list
            end
        end
    end
```

Another user's trip returns 404 rather than 403, so the API does not reveal that the trip exists. `summarizeBudget()` is a pure function, which is why it can be unit tested without a database (TC-UNIT-01 to TC-UNIT-03).

### 3.8 Write a review

```mermaid
sequenceDiagram
    autonumber
    actor T as Traveler
    participant FE as React app
    participant RR as Review routes
    participant DM as DestinationModel
    participant RM as ReviewModel
    participant DB as PostgreSQL

    T->>FE: Open /reviews?destination=sajek-valley
    FE->>RR: GET /api/reviews?destination=sajek-valley
    RR->>RM: list(destinationId) and summary(destinationId)
    RR-->>FE: 200 summary with average, count, distribution, and items
    T->>FE: Choose 4 stars, write a comment, click Submit
    FE->>RR: POST /api/reviews with destinationId, rating, comment and Bearer token
    RR->>RR: authenticate, then validate(body, reviewSchema)
    alt not logged in
        RR-->>FE: 401
    else rating not 1-5 or comment not 10-1000 characters
        RR-->>FE: 400 with field details
    else valid
        RR->>DM: findById(destinationId)
        alt destination missing
            RR-->>FE: 404 Destination not found
        else exists
            RR->>RM: findByUserAndDestination(userId, destinationId)
            alt already reviewed
                RR-->>FE: 409 Edit your existing review instead
            else first review
                RR->>RM: create(userId, destinationId, rating, comment)
                RM->>DB: INSERT INTO reviews
                RR-->>FE: 201 review
                FE->>RR: GET /api/reviews?destination=sajek-valley
                RR-->>FE: Refreshed list and summary
                FE-->>T: New review shown, average rating updated
            end
        end
    end
```

Each traveler may review a destination once (also enforced by `UNIQUE (user_id, destination_id)` in the database); later changes go through `PUT /api/reviews/:id`. Only the author may edit a review, while the author or an admin may delete it.

---

## 4. State machine diagrams

### 4.1 Budget status

```mermaid
stateDiagram-v2
    direction LR
    state "on-track" as OnTrack
    state "warning" as Warning
    state "over" as Over

    [*] --> OnTrack : trip created, nothing spent
    OnTrack --> Warning : percentUsed reaches 80
    OnTrack --> Over : percentUsed goes above 100
    Warning --> Over : percentUsed goes above 100
    Warning --> OnTrack : percentUsed drops below 80
    Over --> Warning : percentUsed drops back to 80-100
    Over --> OnTrack : percentUsed drops below 80
    OnTrack --> [*] : trip deleted
    Warning --> [*] : trip deleted
    Over --> [*] : trip deleted

    note right of Warning
        percentUsed = totalSpent / budget x 100, rounded to 0.1
        on-track below 80, warning 80 to 100, over above 100
        Triggers: add, edit or delete an expense, or change the budget
    end note
```

The status comes from `summarizeBudget()` in `BudgetService.js` (`percentUsed > 100` gives `over`, `percentUsed >= 80` gives `warning`, otherwise `on-track`). It is recalculated on every trip read and never stored; spending exactly 100% of the budget is still `warning`, and a trip with a budget of 0 and some spending counts as 100%.

### 4.2 Trip lifecycle

```mermaid
stateDiagram-v2
    direction LR
    Upcoming : today before startDate
    Upcoming : daysRemaining = tripLength
    Ongoing : startDate to endDate
    Ongoing : daysRemaining = days left including today
    Completed : today after endDate
    Completed : daysRemaining = 0

    [*] --> Upcoming : create trip with a future start date
    [*] --> Ongoing : create trip that includes today
    [*] --> Completed : record a past trip
    Upcoming --> Ongoing : today reaches startDate
    Ongoing --> Completed : today passes endDate
    Completed --> Upcoming : dates edited to the future
    Upcoming --> [*] : trip deleted, expenses cascade
    Ongoing --> [*] : trip deleted, expenses cascade
    Completed --> [*] : trip deleted, expenses cascade
```

The trip state is derived from `startDate`, `endDate` and today's date; it is not a database column. `daysRemaining()` in `BudgetService` uses the same boundaries, and the profile page uses the state to list upcoming trips. Editing the dates re-evaluates the state, so any state can move to any other.

---

## 5. Component diagram

```mermaid
flowchart LR
    subgraph FE["Frontend: React 19 + Vite + TypeScript SPA"]
        direction TB
        Pages["pages/<br/>one component per route"]
        Comps["components/<br/>shared UI, Leaflet maps"]
        Ctx["context/<br/>auth session with JWT"]
        Client["api/<br/>HTTP client"]
        Pages --> Comps
        Pages --> Ctx
        Pages --> Client
        Ctx --> Client
    end

    subgraph BE["Backend: Node.js + Express 5, built by createApp()"]
        direction TB
        Pipe["Middleware pipeline<br/>helmet, cors, express.json, morgan"]
        Routes["Routes<br/>auth, users, destinations, reviews, favorites,<br/>places, weather, navigation, trips, expenses, misc"]
        AuthMW["Auth middleware<br/>authenticate, optionalAuth, requireAdmin"]
        Services["Services<br/>AuthService, WeatherService, RouteService,<br/>GeocodeService, NearbyService"]
        Budget["BudgetService<br/>summarizeBudget, tripLength, daysRemaining"]
        Models["Models<br/>User, Destination, Place, Review, Favorite,<br/>Trip, Expense, Newsletter"]
        Utils["Utils<br/>validate, geo, fetchJson, HttpError"]
        Err["Error handler<br/>JSON error responses"]
        Static["Static files<br/>frontend/dist in production"]
        Pipe --> Routes
        Routes -->|"guards"| AuthMW
        AuthMW -->|"verifyToken"| Services
        Routes --> Services
        Routes --> Budget
        Routes --> Models
        Services --> Models
        Routes -.-> Utils
        Services -.-> Utils
        Routes -.->|"thrown HttpError"| Err
    end

    DB[("PostgreSQL 17<br/>Docker container tripza-db")]

    subgraph EXT["External services, no API keys"]
        direction TB
        OM["Open-Meteo<br/>weather"]
        OSRM["OSRM<br/>routing.openstreetmap.de"]
        NOM["Nominatim<br/>geocoding"]
        OVP["Overpass API<br/>OpenStreetMap places"]
        GM["Google Maps<br/>directions deep link"]
        TILES["OpenStreetMap<br/>map tiles"]
    end

    Client -->|"REST + JSON, Bearer JWT"| Pipe
    Static -.->|"serves built SPA"| FE
    Models --> DB
    Services -->|"WeatherService"| OM
    Services -->|"RouteService"| OSRM
    Services -->|"GeocodeService"| NOM
    Services -->|"NearbyService"| OVP
    Comps -->|"Start navigation"| GM
    Comps -->|"Leaflet"| TILES
```

The backend is layered: routes validate input and check access, services hold business logic and external API calls, and models are the only code that runs SQL. Simple CRUD routes (destinations, favorites, reviews, trips, expenses) call models directly, while authentication and all external lookups go through services.

---

## 6. Deployment diagram

```mermaid
flowchart LR
    subgraph Device["«device» Traveler's computer or phone"]
        subgraph Browser["«execution environment» Web browser"]
            SPA["«artifact» Tripza SPA<br/>index.html, JS and CSS bundle"]
            GeoAPI["Geolocation API"]
        end
    end

    subgraph Server["«device» Application server"]
        subgraph Node["«execution environment» Node.js 22 or newer"]
            API["«artifact» tripza-backend<br/>src/server.js, Express 5<br/>PORT 4000 by default"]
            Dist["«artifact» frontend/dist<br/>built with Vite"]
        end
        subgraph Docker["«execution environment» Docker, docker compose"]
            DBFile[("«container» tripza-db<br/>PostgreSQL 17, port 5432<br/>volume tripza-pgdata")]
        end
        Env["«artifact» .env<br/>DATABASE_URL, JWT_SECRET, LIVE_APIS, CORS_ORIGIN"]
    end

    subgraph Internet["Internet services over HTTPS"]
        OM["api.open-meteo.com"]
        OSRM["routing.openstreetmap.de"]
        NOM["nominatim.openstreetmap.org"]
        OVP["overpass-api.de"]
        GM["www.google.com/maps"]
    end

    SPA -->|"HTTP /api/*, JSON, Bearer JWT"| API
    SPA --> GeoAPI
    API -->|"serves non-API GET requests"| Dist
    Dist -.->|"downloaded by browser"| SPA
    API -->|"pg pool, TCP 5432"| DBFile
    API -.->|"read at start-up"| Env
    API -->|"fetch, 6-9 s timeout"| OM
    API -->|"fetch, 8 s timeout"| OSRM
    API -->|"fetch, 6 s timeout"| NOM
    API -->|"fetch, 9 s timeout"| OVP
    SPA -->|"opens directions link"| GM
```

In production a single Node.js process serves both the REST API and the built frontend from `frontend/dist`, and PostgreSQL runs in a Docker container started with `docker compose up -d` (data is kept in the `tripza-pgdata` volume). The API creates any missing tables at start-up and seeds an empty database; `npm run seed` drops and recreates the tables with fresh sample data. During development the Vite dev server serves the frontend and calls the API on port 4000 (`CORS_ORIGIN` controls which origins are allowed); setting `LIVE_APIS=false` removes all outbound calls.

---

## 7. Entity relationship diagram

```mermaid
erDiagram
    users ||--o{ reviews : writes
    destinations ||--o{ reviews : receives
    users ||--o{ favorites : saves
    users ||--o{ trips : plans
    trips ||--o{ expenses : contains
    destinations |o--o{ places : "has nearby"
    destinations |o--o{ trips : "is visited on"
    destinations |o..o{ favorites : "item_type destination"
    places |o..o{ favorites : "item_type place"

    users {
        SERIAL id PK
        TEXT name "NOT NULL"
        TEXT email UK "NOT NULL, unique on lower(email)"
        TEXT password_hash "NOT NULL, bcrypt hash"
        TEXT role "NOT NULL, user or admin, default user"
        TEXT location
        TEXT bio
        TIMESTAMPTZ created_at "NOT NULL, default now()"
    }
    destinations {
        SERIAL id PK
        TEXT slug UK "NOT NULL"
        TEXT name "NOT NULL"
        TEXT location "NOT NULL"
        TEXT country "NOT NULL"
        TEXT region "Asia, Europe, Americas, Africa, Oceania"
        TEXT category "Beach, Mountain, Historical, City, Nature"
        TEXT tag
        TEXT summary
        TEXT description "NOT NULL"
        TEXT image_url "NOT NULL"
        JSONB gallery "NOT NULL, array of image URLs, default empty"
        float8 latitude "NOT NULL"
        float8 longitude "NOT NULL"
        TEXT best_time
        TEXT entry_fee
        TEXT opening_hours
        TEXT getting_there
        TEXT local_tip
        NUMERIC avg_cost "(10,2), NOT NULL, default 0"
        TIMESTAMPTZ created_at "NOT NULL, default now()"
    }
    places {
        SERIAL id PK
        INTEGER destination_id FK "nullable, ON DELETE SET NULL"
        TEXT name "NOT NULL"
        TEXT category "restaurant, hospital, hotel, shopping, atm, other"
        TEXT type "NOT NULL"
        TEXT address
        TEXT phone
        float8 latitude "NOT NULL, indexed with longitude"
        float8 longitude "NOT NULL"
        NUMERIC rating "(2,1), NOT NULL, default 0"
    }
    reviews {
        SERIAL id PK
        INTEGER user_id FK "NOT NULL, ON DELETE CASCADE"
        INTEGER destination_id FK "NOT NULL, ON DELETE CASCADE, indexed"
        SMALLINT rating "NOT NULL, CHECK 1 to 5"
        TEXT comment "NOT NULL"
        TIMESTAMPTZ created_at "NOT NULL, default now()"
        TIMESTAMPTZ updated_at "NOT NULL, default now()"
    }
    favorites {
        SERIAL id PK
        INTEGER user_id FK "NOT NULL, ON DELETE CASCADE, indexed"
        TEXT item_type "NOT NULL, destination or place"
        INTEGER item_id "NOT NULL, id in destinations or places"
        TIMESTAMPTZ created_at "NOT NULL, default now()"
    }
    trips {
        SERIAL id PK
        INTEGER user_id FK "NOT NULL, ON DELETE CASCADE, indexed"
        INTEGER destination_id FK "nullable, ON DELETE SET NULL"
        TEXT name "NOT NULL"
        DATE start_date "NOT NULL"
        DATE end_date "NOT NULL, CHECK end_date >= start_date"
        NUMERIC budget "(14,2), NOT NULL, CHECK budget >= 0"
        TEXT currency "NOT NULL, default USD"
        TIMESTAMPTZ created_at "NOT NULL, default now()"
    }
    expenses {
        SERIAL id PK
        INTEGER trip_id FK "NOT NULL, ON DELETE CASCADE, indexed"
        TEXT title "NOT NULL"
        TEXT category "Transportation, Accommodation, Food, Shopping, Other"
        NUMERIC amount "(14,2), NOT NULL, CHECK amount > 0"
        DATE spent_on "NOT NULL"
        TEXT note
        TIMESTAMPTZ created_at "NOT NULL, default now()"
    }
    newsletter_subscribers {
        SERIAL id PK
        TEXT email UK "NOT NULL, unique on lower(email)"
        TIMESTAMPTZ created_at "NOT NULL, default now()"
    }
```

This matches `backend/src/db/schema.sql` table for table. Two composite unique constraints are not visible in the diagram: `reviews UNIQUE (user_id, destination_id)` (one review per traveler per destination) and `favorites UNIQUE (user_id, item_type, item_id)` (an item is saved once). The dotted `favorites` links are polymorphic (`item_type` + `item_id`) and not enforced by a foreign key; `DestinationModel.delete()` removes matching favorites in the same transaction.
