import { fetchJson } from "../utils/http.js"

/** WMO weather interpretation codes used by Open-Meteo. */
const WEATHER_CODES = [
  [[0], "Clear sky", "sun"],
  [[1], "Mostly sunny", "sun"],
  [[2], "Partly cloudy", "cloud-sun"],
  [[3], "Overcast", "cloud"],
  [[45, 48], "Foggy", "fog"],
  [[51, 53, 55, 56, 57], "Drizzle", "drizzle"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "Rain", "rain"],
  [[71, 73, 75, 77, 85, 86], "Snow", "snow"],
  [[95, 96, 99], "Thunderstorm", "storm"],
]

export function describeWeather(code) {
  const match = WEATHER_CODES.find(([codes]) => codes.includes(code))
  return match ? { condition: match[1], icon: match[2] } : { condition: "Unknown", icon: "cloud" }
}

/** A short travel recommendation derived from the current conditions and today's forecast. */
export function travelSuggestion(current, today) {
  const { icon } = describeWeather(current.code)
  const rainChance = today?.precipitationChance ?? 0

  if (icon === "storm") {
    return {
      level: "alert",
      title: "Stay flexible today",
      text: "Thunderstorms are expected. Avoid boat trips and hikes, and keep indoor plans ready.",
    }
  }
  if (icon === "rain" || icon === "drizzle" || rainChance >= 60) {
    return {
      level: "caution",
      title: "Pack an umbrella",
      text: `There is a ${rainChance}% chance of rain. Museums, cafés and markets make good backup plans.`,
    }
  }
  if (current.temperature >= 35) {
    return {
      level: "caution",
      title: "Very hot — plan for shade",
      text: "Sightsee early or late in the day, drink plenty of water and wear sun protection.",
    }
  }
  if (current.temperature <= 5) {
    return {
      level: "caution",
      title: "Bundle up",
      text: "It is cold out. Wear layers and check opening hours, as some outdoor sites may close early.",
    }
  }
  if (current.windSpeed >= 40) {
    return {
      level: "caution",
      title: "Windy conditions",
      text: "Strong winds may cancel ferries and boat tours. Confirm bookings before heading out.",
    }
  }
  return {
    level: "good",
    title: "Good day for sightseeing",
    text: "Mild temperatures and low rain chances — perfect for exploring. Bring sunglasses and water.",
  }
}

/** Deterministic stand-in forecast used when live weather is unavailable (offline mode or API failure). */
export function simulatedForecast({ lat, lng }, now = new Date()) {
  const seasonal = Math.cos(((now.getMonth() - (lat >= 0 ? 6 : 0)) / 12) * 2 * Math.PI)
  const base = Math.round(31 - Math.abs(lat) * 0.42 - seasonal * Math.min(Math.abs(lat), 45) * 0.25)
  const seed = Math.abs(Math.round(lat * 7 + lng * 3))
  const codes = [1, 2, 0, 3, 61, 2, 1, 80, 0, 2]

  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getTime() + index * 86400000)
    const code = codes[(seed + index) % codes.length]
    const high = base + ((seed + index * 3) % 5) - 1
    return {
      date: date.toISOString().slice(0, 10),
      high,
      low: high - 7,
      code,
      ...describeWeather(code),
      precipitationChance: [61, 80].includes(code) ? 70 : (seed + index * 11) % 25,
      sunrise: null,
      sunset: null,
    }
  })

  const today = daily[0]
  return {
    current: {
      temperature: today.high - 2,
      feelsLike: today.high - 1,
      humidity: 55 + (seed % 30),
      windSpeed: 6 + (seed % 15),
      visibilityKm: 10,
      code: today.code,
      ...describeWeather(today.code),
      isDay: true,
      time: now.toISOString().slice(0, 16),
    },
    daily,
    timezone: "UTC",
  }
}

export class WeatherService {
  constructor({ liveApis = true, cacheTtlMs = 10 * 60 * 1000 } = {}) {
    this.liveApis = liveApis
    this.cacheTtlMs = cacheTtlMs
    this.cache = new Map()
  }

  async #fetchOpenMeteo({ lat, lng }) {
    const url = new URL("https://api.open-meteo.com/v1/forecast")
    url.search = new URLSearchParams({
      latitude: lat,
      longitude: lng,
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,visibility,is_day",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
      timezone: "auto",
      forecast_days: "7",
    })
    const data = await fetchJson(url)
    const c = data.current
    return {
      current: {
        temperature: Math.round(c.temperature_2m),
        feelsLike: Math.round(c.apparent_temperature),
        humidity: c.relative_humidity_2m,
        windSpeed: Math.round(c.wind_speed_10m),
        visibilityKm: c.visibility != null ? Math.round(c.visibility / 100) / 10 : null,
        code: c.weather_code,
        ...describeWeather(c.weather_code),
        isDay: c.is_day === 1,
        time: c.time,
      },
      daily: data.daily.time.map((date, i) => ({
        date,
        high: Math.round(data.daily.temperature_2m_max[i]),
        low: Math.round(data.daily.temperature_2m_min[i]),
        code: data.daily.weather_code[i],
        ...describeWeather(data.daily.weather_code[i]),
        precipitationChance: data.daily.precipitation_probability_max[i] ?? 0,
        sunrise: data.daily.sunrise[i],
        sunset: data.daily.sunset[i],
      })),
      timezone: data.timezone,
    }
  }

  /** Current conditions, a 7-day forecast and a travel suggestion for a coordinate. */
  async getForecast({ lat, lng }, { name = null } = {}) {
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`
    const cached = this.cache.get(key)
    let result = cached && Date.now() - cached.at < this.cacheTtlMs ? cached.value : null

    if (!result) {
      let source = "simulated"
      let forecast
      if (this.liveApis) {
        try {
          forecast = await this.#fetchOpenMeteo({ lat, lng })
          source = "open-meteo"
        } catch {
          forecast = null
        }
      }
      forecast ??= simulatedForecast({ lat, lng })
      result = { ...forecast, source, fetchedAt: new Date().toISOString() }
      if (source !== "simulated") this.cache.set(key, { at: Date.now(), value: result })
    }

    const today = result.daily[0]
    return {
      location: { name, latitude: lat, longitude: lng, timezone: result.timezone },
      current: result.current,
      today,
      daily: result.daily,
      suggestion: travelSuggestion(result.current, today),
      source: result.source,
      fetchedAt: result.fetchedAt,
    }
  }
}
