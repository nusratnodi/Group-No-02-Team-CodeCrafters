/** Parses a YYYY-MM-DD string as a local calendar date (avoids timezone shifts). */
export function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function toIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function formatMoney(amount: number, currency = "USD", digits = 2) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(digits)}`
  }
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  return parseDate(value).toLocaleDateString("en-US", options)
}

/** "Jun 16–22", "Nov 28 – Dec 2", adding the year when it isn't the current one. */
export function formatDateRange(start: string, end: string, today = new Date()) {
  const a = parseDate(start)
  const b = parseDate(end)
  const withYear = b.getFullYear() !== today.getFullYear() || a.getFullYear() !== b.getFullYear()
  const month = (d: Date) => d.toLocaleDateString("en-US", { month: "short" })
  const year = withYear ? `, ${b.getFullYear()}` : ""
  if (start === end) return `${month(a)} ${a.getDate()}${year}`
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${month(a)} ${a.getDate()}–${b.getDate()}${year}`
  }
  return `${month(a)} ${a.getDate()} – ${month(b)} ${b.getDate()}${year}`
}

/** Whole days from today until the given date (negative if it has passed). */
export function daysUntil(value: string, today = new Date()) {
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((parseDate(value).getTime() - midnight.getTime()) / 86400000)
}

/** "just now", "3 days ago", "2 weeks ago" … for API timestamps (stored in UTC). */
export function timeAgo(timestamp: string, now = new Date()) {
  const iso = timestamp.includes("T") ? timestamp : `${timestamp.replace(" ", "T")}Z`
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000)
  const units: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ]
  for (const [size, unit] of units) {
    const value = Math.floor(seconds / size)
    if (value >= 1) return `${value} ${unit}${value > 1 ? "s" : ""} ago`
  }
  return "just now"
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

export function plural(count: number, word: string, pluralWord = `${word}s`) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? word : pluralWord}`
}
