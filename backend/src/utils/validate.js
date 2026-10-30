import { badRequest } from "./errors.js"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** Largest value a PostgreSQL INTEGER column (used for ids) can hold. */
export const MAX_INT = 2147483647
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function check(value, rule) {
  switch (rule.type) {
    case "string":
    case "password": {
      if (typeof value !== "string") return "must be text"
      if (rule.min && value.length < rule.min) return `must be at least ${rule.min} characters`
      if (rule.max && value.length > rule.max) return `must be at most ${rule.max} characters`
      if (rule.pattern && !rule.pattern.test(value)) return rule.patternMessage || "is not in the right format"
      return null
    }
    case "email":
      return typeof value === "string" && EMAIL.test(value) && value.length <= 120
        ? null
        : "must be a valid email address"
    case "number":
    case "integer": {
      const number = Number(value)
      if (value === true || value === false || !Number.isFinite(number)) return "must be a number"
      if (rule.type === "integer" && !Number.isInteger(number)) return "must be a whole number"
      if (rule.type === "integer" && Math.abs(number) > MAX_INT) return "is too large"
      if (rule.min !== undefined && number < rule.min) return `must be at least ${rule.min}`
      if (rule.max !== undefined && number > rule.max) return `must be at most ${rule.max}`
      return null
    }
    case "enum":
      return rule.values.includes(value) ? null : `must be one of: ${rule.values.join(", ")}`
    case "date": {
      if (typeof value !== "string" || !ISO_DATE.test(value)) return "must be a date (YYYY-MM-DD)"
      return Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? "must be a valid date" : null
    }
    case "url":
      return typeof value === "string" && isHttpUrl(value) ? null : "must be a valid http(s) URL"
    case "urls":
      return Array.isArray(value) && value.length <= 12 && value.every((item) => typeof item === "string" && isHttpUrl(item))
        ? null
        : "must be a list of up to 12 http(s) URLs"
    default:
      throw new Error(`Unknown validation type: ${rule.type}`)
  }
}

function coerce(value, rule) {
  if (rule.type === "number" || rule.type === "integer") return Number(value)
  if (rule.type === "email") return value.toLowerCase()
  return value
}

/**
 * Validates `input` against `schema` and returns only the known, cleaned fields.
 * With `partial`, missing fields are skipped (used for updates).
 * Throws a 400 HttpError whose `details` maps each invalid field to a message.
 */
export function validate(input, schema, { partial = false } = {}) {
  const data = {}
  const errors = {}

  for (const [field, rule] of Object.entries(schema)) {
    const label = rule.label || field
    let value = input?.[field]
    if (typeof value === "string" && rule.type !== "password") value = value.trim()
    const missing = value === undefined || value === null || value === ""

    if (missing) {
      if (rule.required && (!partial || value !== undefined)) errors[field] = `${label} is required`
      else if (value !== undefined) data[field] = null
      else if (!partial && rule.default !== undefined) data[field] = rule.default
      continue
    }

    const problem = check(value, rule)
    if (problem) errors[field] = `${label} ${problem}`
    else data[field] = coerce(value, rule)
  }

  if (Object.keys(errors).length > 0) throw badRequest("Please check the highlighted fields", errors)
  return data
}

/** Parses an integer route/query parameter, throwing 400 if it is not a positive integer. */
export function parseId(value, label = "id") {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0 || id > MAX_INT) throw badRequest(`Invalid ${label}`)
  return id
}

/** Reads a list from a query value such as `?category=Beach,City` or repeated keys. */
export function parseList(value) {
  if (value === undefined) return []
  const raw = Array.isArray(value) ? value : String(value).split(",")
  return raw.map((item) => String(item).trim()).filter(Boolean)
}
