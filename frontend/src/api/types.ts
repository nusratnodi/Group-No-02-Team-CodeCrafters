export type Role = "user" | "admin"

export interface User {
  id: number
  name: string
  email: string
  role: Role
  location: string | null
  bio: string | null
  createdAt: string
}

export interface UserStats {
  trips: number
  favorites: number
  reviews: number
}

export interface AuthResponse {
  token: string
  user: User
}

export type Category = "Beach" | "Mountain" | "Historical" | "City" | "Nature"
export type Region = "Asia" | "Europe" | "Americas" | "Africa" | "Oceania"
export type BudgetBand = "low" | "mid" | "high"

export interface Destination {
  id: number
  slug: string
  name: string
  location: string
  country: string
  region: Region
  category: Category
  tag: string | null
  summary: string | null
  description: string
  imageUrl: string
  gallery: string[]
  latitude: number
  longitude: number
  bestTime: string | null
  entryFee: string | null
  openingHours: string | null
  gettingThere: string | null
  localTip: string | null
  avgCost: number
  rating: number
  reviewCount: number
  createdAt: string
}

export type DestinationInput = Omit<Destination, "id" | "slug" | "rating" | "reviewCount" | "createdAt">

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages?: number
}

export type PlaceCategory = "restaurant" | "hospital" | "hotel" | "shopping" | "atm" | "other"

export interface Place {
  id: number | string
  external?: boolean
  destinationId: number | null
  destinationName: string | null
  name: string
  category: PlaceCategory
  type: string
  address: string | null
  phone: string | null
  latitude: number
  longitude: number
  rating: number | null
  distanceKm?: number
}

export interface LatLng {
  lat: number
  lng: number
}

export interface DestinationRef {
  id: number
  slug: string
  name: string
}

export interface NearbyResult {
  center: LatLng & { name: string | null; destination: DestinationRef | null }
  radiusKm: number
  items: Place[]
  total: number
  source: "tripza" | "openstreetmap"
}

export interface Review {
  id: number
  userId: number
  userName: string
  destinationId: number
  destinationName: string
  destinationSlug: string
  rating: number
  comment: string
  createdAt: string
  updatedAt: string
}

export interface ReviewSummary {
  average: number
  count: number
  distribution: Record<string, number>
}

export interface ReviewList extends Paged<Review> {
  summary: ReviewSummary
}

export type WeatherIconName = "sun" | "cloud-sun" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "storm"

export interface WeatherDay {
  date: string
  high: number
  low: number
  code: number
  condition: string
  icon: WeatherIconName
  precipitationChance: number
  sunrise: string | null
  sunset: string | null
}

export interface Weather {
  location: {
    name: string | null
    latitude: number
    longitude: number
    timezone: string
    destination: DestinationRef | null
  }
  current: {
    temperature: number
    feelsLike: number
    humidity: number
    windSpeed: number
    visibilityKm: number | null
    code: number
    condition: string
    icon: WeatherIconName
    isDay: boolean
    time: string
  }
  today: WeatherDay
  daily: WeatherDay[]
  suggestion: { level: "good" | "caution" | "alert"; title: string; text: string }
  source: "open-meteo" | "simulated"
  fetchedAt: string
}

export type TravelMode = "car" | "bus" | "walk"

export interface Route {
  mode: TravelMode
  from: LatLng
  to: LatLng
  distanceKm: number
  durationMin: number
  durationText: string
  via: string | null
  geometry: [number, number][]
  notes: string[]
  source: "openstreetmap" | "estimate"
  navigationUrl: string
}

export interface GeocodeResult {
  name: string
  label: string
  lat: number
  lng: number
  type: "destination" | "place"
  slug?: string
}

export type ExpenseCategory = "Transportation" | "Accommodation" | "Food" | "Shopping" | "Other"

export interface Expense {
  id: number
  tripId: number
  title: string
  category: ExpenseCategory
  amount: number
  spentOn: string
  note: string | null
  createdAt: string
}

export type ExpenseInput = Pick<Expense, "title" | "category" | "amount" | "spentOn" | "note">

export type BudgetStatus = "on-track" | "warning" | "over"

export interface BudgetSummary {
  budget: number
  currency: string
  totalSpent: number
  remaining: number
  percentUsed: number
  status: BudgetStatus
  days: number
  daysLeft: number
  perDayRemaining: number
  expenseCount: number
  byCategory: { category: ExpenseCategory; amount: number; percent: number }[]
}

export interface Trip {
  id: number
  userId: number
  destinationId: number | null
  destinationName: string | null
  destinationSlug: string | null
  destinationImage: string | null
  name: string
  startDate: string
  endDate: string
  budget: number
  currency: string
  totalSpent: number
  createdAt: string
  summary?: BudgetSummary
}

export type TripInput = Pick<Trip, "name" | "destinationId" | "startDate" | "endDate" | "budget" | "currency">

export interface TripDetail {
  trip: Trip
  summary: BudgetSummary
  expenses: Expense[]
}

export interface Favorites {
  destinations: (Destination & { savedAt: string })[]
  places: (Place & { savedAt: string })[]
}

export type FavoriteType = "destination" | "place"

export interface AdminStats {
  users: number
  destinations: number
  reviews: number
  trips: number
  subscribers: number
}
