-- Tripza database schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL       PRIMARY KEY,
  name          TEXT         NOT NULL,
  email         TEXT         NOT NULL,
  password_hash TEXT         NOT NULL,
  role          TEXT         NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  location      TEXT,
  bio           TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Emails are unique regardless of letter case.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

CREATE TABLE IF NOT EXISTS destinations (
  id            SERIAL           PRIMARY KEY,
  slug          TEXT             NOT NULL UNIQUE,
  name          TEXT             NOT NULL,
  location      TEXT             NOT NULL,
  country       TEXT             NOT NULL,
  region        TEXT             NOT NULL CHECK (region IN ('Asia', 'Europe', 'Americas', 'Africa', 'Oceania')),
  category      TEXT             NOT NULL CHECK (category IN ('Beach', 'Mountain', 'Historical', 'City', 'Nature')),
  tag           TEXT,
  summary       TEXT,
  description   TEXT             NOT NULL,
  image_url     TEXT             NOT NULL,
  gallery       JSONB            NOT NULL DEFAULT '[]',
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  best_time     TEXT,
  entry_fee     TEXT,
  opening_hours TEXT,
  getting_there TEXT,
  local_tip     TEXT,
  avg_cost      NUMERIC(10, 2)   NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS places (
  id             SERIAL           PRIMARY KEY,
  destination_id INTEGER          REFERENCES destinations(id) ON DELETE SET NULL,
  name           TEXT             NOT NULL,
  category       TEXT             NOT NULL CHECK (category IN ('restaurant', 'hospital', 'hotel', 'shopping', 'atm', 'other')),
  type           TEXT             NOT NULL,
  address        TEXT,
  phone          TEXT,
  latitude       DOUBLE PRECISION NOT NULL,
  longitude      DOUBLE PRECISION NOT NULL,
  rating         NUMERIC(2, 1)    NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reviews (
  id             SERIAL       PRIMARY KEY,
  user_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_id INTEGER      NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  rating         SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT         NOT NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (user_id, destination_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id         SERIAL       PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type  TEXT         NOT NULL CHECK (item_type IN ('destination', 'place')),
  item_id    INTEGER      NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS trips (
  id             SERIAL         PRIMARY KEY,
  user_id        INTEGER        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_id INTEGER        REFERENCES destinations(id) ON DELETE SET NULL,
  name           TEXT           NOT NULL,
  start_date     DATE           NOT NULL,
  end_date       DATE           NOT NULL,
  budget         NUMERIC(14, 2) NOT NULL CHECK (budget >= 0),
  currency       TEXT           NOT NULL DEFAULT 'USD',
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS expenses (
  id         SERIAL         PRIMARY KEY,
  trip_id    INTEGER        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title      TEXT           NOT NULL,
  category   TEXT           NOT NULL CHECK (category IN ('Transportation', 'Accommodation', 'Food', 'Shopping', 'Other')),
  amount     NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  spent_on   DATE           NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         SERIAL       PRIMARY KEY,
  email      TEXT         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_email_key ON newsletter_subscribers (lower(email));

CREATE INDEX IF NOT EXISTS idx_places_location ON places (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_reviews_destination ON reviews (destination_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_trips_user ON trips (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses (trip_id);
