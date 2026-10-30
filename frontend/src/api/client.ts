import type {
  AdminStats,
  AuthResponse,
  Destination,
  DestinationInput,
  Expense,
  ExpenseInput,
  Favorites,
  FavoriteType,
  GeocodeResult,
  NearbyResult,
  Paged,
  Place,
  Review,
  ReviewList,
  Route,
  TravelMode,
  Trip,
  TripDetail,
  TripInput,
  User,
  UserStats,
  Weather,
} from "./types"

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "")
const TOKEN_KEY = "tripza.token"

/** An error returned by the Tripza API, with optional per-field messages. */
export class ApiError extends Error {
  status: number
  details?: Record<string, string>

  constructor(status: number, message: string, details?: Record<string, string>) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

let token: string | null = null
try {
  token = localStorage.getItem(TOKEN_KEY)
} catch {
  token = null
}

let onUnauthorized: (() => void) | null = null

export function getToken() {
  return token
}

export function setToken(next: string | null) {
  token = next
  try {
    if (next) localStorage.setItem(TOKEN_KEY, next)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage can be unavailable (private mode); the session then lasts until reload.
  }
}

/** Called when a request with a token is rejected, so the app can log the user out. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

type Query = Record<string, string | number | boolean | undefined | null | (string | number)[]>

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","))
    } else {
      params.set(key, String(value))
    }
  }
  const search = params.toString()
  return `${API_URL}/api${path}${search ? `?${search}` : ""}`
}

export async function request<T>(
  path: string,
  { method = "GET", body, query }: { method?: string; body?: unknown; query?: Query } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Cannot reach the Tripza server. Check that the backend is running and try again.")
  }

  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized?.()
    const message = data?.error?.message ?? `Request failed (${response.status})`
    throw new ApiError(response.status, message, data?.error?.details)
  }
  return data as T
}

export interface DestinationQuery {
  q?: string
  category?: string[]
  region?: string[]
  budget?: string[]
  minRating?: number
  sort?: string
  page?: number
  limit?: number
}

export interface LocationQuery {
  destination?: string
  lat?: number
  lng?: number
  name?: string
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<AuthResponse>("/auth/login", { method: "POST", body: { email, password } }),
    register: (name: string, email: string, password: string) =>
      request<AuthResponse>("/auth/register", { method: "POST", body: { name, email, password } }),
    me: () => request<{ user: User }>("/auth/me"),
  },
  users: {
    me: () => request<{ user: User; stats: UserStats }>("/users/me"),
    update: (data: Partial<Pick<User, "name" | "location" | "bio">>) =>
      request<{ user: User }>("/users/me", { method: "PUT", body: data }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ message: string }>("/users/me/password", { method: "PUT", body: { currentPassword, newPassword } }),
  },
  destinations: {
    list: (query: DestinationQuery = {}) =>
      request<Paged<Destination>>("/destinations", { query: { ...query } }),
    get: (slug: string) => request<{ destination: Destination }>(`/destinations/${encodeURIComponent(slug)}`),
    create: (data: Partial<DestinationInput>) =>
      request<{ destination: Destination }>("/destinations", { method: "POST", body: data }),
    update: (id: number, data: Partial<DestinationInput>) =>
      request<{ destination: Destination }>(`/destinations/${id}`, { method: "PUT", body: data }),
    remove: (id: number) => request<void>(`/destinations/${id}`, { method: "DELETE" }),
  },
  reviews: {
    list: (query: { destination?: string; mine?: boolean; page?: number; limit?: number } = {}) =>
      request<ReviewList>("/reviews", { query }),
    create: (data: { destinationId: number; rating: number; comment: string }) =>
      request<{ review: Review }>("/reviews", { method: "POST", body: data }),
    update: (id: number, data: { rating?: number; comment?: string }) =>
      request<{ review: Review }>(`/reviews/${id}`, { method: "PUT", body: data }),
    remove: (id: number) => request<void>(`/reviews/${id}`, { method: "DELETE" }),
  },
  favorites: {
    list: () => request<Favorites>("/favorites"),
    add: (itemType: FavoriteType, itemId: number) =>
      request<{ saved: boolean }>("/favorites", { method: "POST", body: { itemType, itemId } }),
    remove: (itemType: FavoriteType, itemId: number) =>
      request<void>(`/favorites/${itemType}/${itemId}`, { method: "DELETE" }),
  },
  places: {
    nearby: (query: LocationQuery & { category?: string; sort?: string; radius?: number; limit?: number }) =>
      request<NearbyResult>("/nearby", { query: { ...query } }),
    get: (id: number) => request<{ place: Place }>(`/places/${id}`),
  },
  weather: {
    get: (query: LocationQuery) => request<Weather>("/weather", { query: { ...query } }),
  },
  navigation: {
    route: (query: { from: string; to?: string; destination?: string; mode: TravelMode }) =>
      request<{ route: Route }>("/navigation/route", { query }),
    geocode: (q: string) => request<{ results: GeocodeResult[] }>("/navigation/geocode", { query: { q } }),
  },
  trips: {
    list: () => request<{ items: Trip[] }>("/trips"),
    get: (id: number) => request<TripDetail>(`/trips/${id}`),
    create: (data: TripInput) => request<{ trip: Trip }>("/trips", { method: "POST", body: data }),
    update: (id: number, data: Partial<TripInput>) =>
      request<{ trip: Trip }>(`/trips/${id}`, { method: "PUT", body: data }),
    remove: (id: number) => request<void>(`/trips/${id}`, { method: "DELETE" }),
    addExpense: (tripId: number, data: ExpenseInput) =>
      request<{ expense: Expense }>(`/trips/${tripId}/expenses`, { method: "POST", body: data }),
  },
  expenses: {
    update: (id: number, data: Partial<ExpenseInput>) =>
      request<{ expense: Expense }>(`/expenses/${id}`, { method: "PUT", body: data }),
    remove: (id: number) => request<void>(`/expenses/${id}`, { method: "DELETE" }),
  },
  newsletter: {
    subscribe: (email: string) => request<{ message: string }>("/newsletter", { method: "POST", body: { email } }),
  },
  admin: {
    stats: () => request<AdminStats>("/admin/stats"),
  },
}
