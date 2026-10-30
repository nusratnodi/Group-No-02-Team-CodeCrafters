import { CATEGORIES, REGIONS } from "../models/DestinationModel.js"
import { EXPENSE_CATEGORIES } from "../models/ExpenseModel.js"
import { FAVORITE_TYPES } from "../models/FavoriteModel.js"
import { CURRENCIES } from "../models/TripModel.js"

/** Validation rules for every request body the API accepts (see utils/validate.js). */

const password = (label) => ({
  type: "password",
  required: true,
  min: 8,
  max: 72,
  pattern: /^(?=.*[A-Za-z])(?=.*\d)/,
  patternMessage: "must include at least one letter and one number",
  label,
})

export const registerSchema = {
  name: { type: "string", required: true, min: 2, max: 60, label: "Name" },
  email: { type: "email", required: true, label: "Email" },
  password: password("Password"),
}

export const loginSchema = {
  email: { type: "email", required: true, label: "Email" },
  password: { type: "password", required: true, label: "Password" },
}

export const profileSchema = {
  name: { type: "string", required: true, min: 2, max: 60, label: "Name" },
  location: { type: "string", max: 80, label: "Location" },
  bio: { type: "string", max: 280, label: "Bio" },
}

export const changePasswordSchema = {
  currentPassword: { type: "password", required: true, label: "Current password" },
  newPassword: password("New password"),
}

export const destinationSchema = {
  name: { type: "string", required: true, min: 2, max: 80, label: "Name" },
  location: { type: "string", required: true, min: 2, max: 100, label: "Location" },
  country: { type: "string", required: true, min: 2, max: 60, label: "Country" },
  region: { type: "enum", required: true, values: REGIONS, label: "Region" },
  category: { type: "enum", required: true, values: CATEGORIES, label: "Category" },
  tag: { type: "string", max: 40, label: "Tag" },
  summary: { type: "string", max: 120, label: "Headline" },
  description: { type: "string", required: true, min: 20, max: 4000, label: "Description" },
  imageUrl: { type: "url", required: true, label: "Image URL" },
  gallery: { type: "urls", label: "Gallery" },
  latitude: { type: "number", required: true, min: -90, max: 90, label: "Latitude" },
  longitude: { type: "number", required: true, min: -180, max: 180, label: "Longitude" },
  bestTime: { type: "string", max: 80, label: "Best time to visit" },
  entryFee: { type: "string", max: 80, label: "Entry fee" },
  openingHours: { type: "string", max: 80, label: "Opening hours" },
  gettingThere: { type: "string", max: 160, label: "Getting there" },
  localTip: { type: "string", max: 300, label: "Local tip" },
  avgCost: { type: "number", required: true, min: 0, max: 100000, label: "Estimated cost" },
}

export const reviewSchema = {
  destinationId: { type: "integer", required: true, min: 1, label: "Destination" },
  rating: { type: "integer", required: true, min: 1, max: 5, label: "Rating" },
  comment: { type: "string", required: true, min: 10, max: 1000, label: "Review" },
}

export const reviewUpdateSchema = {
  rating: reviewSchema.rating,
  comment: reviewSchema.comment,
}

export const favoriteSchema = {
  itemType: { type: "enum", required: true, values: FAVORITE_TYPES, label: "Item type" },
  itemId: { type: "integer", required: true, min: 1, label: "Item" },
}

export const tripSchema = {
  name: { type: "string", required: true, min: 2, max: 80, label: "Trip name" },
  destinationId: { type: "integer", min: 1, label: "Destination" },
  startDate: { type: "date", required: true, label: "Start date" },
  endDate: { type: "date", required: true, label: "End date" },
  budget: { type: "number", required: true, min: 0, max: 100000000, label: "Budget" },
  currency: { type: "enum", values: CURRENCIES, default: "USD", label: "Currency" },
}

export const expenseSchema = {
  title: { type: "string", required: true, min: 2, max: 80, label: "Title" },
  category: { type: "enum", required: true, values: EXPENSE_CATEGORIES, label: "Category" },
  amount: { type: "number", required: true, min: 0.01, max: 100000000, label: "Amount" },
  spentOn: { type: "date", required: true, label: "Date" },
  note: { type: "string", max: 280, label: "Note" },
}

export const newsletterSchema = {
  email: { type: "email", required: true, label: "Email" },
}
