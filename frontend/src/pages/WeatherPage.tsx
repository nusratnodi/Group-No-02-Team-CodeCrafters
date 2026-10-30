import { useEffect, useState } from "react"
import { AlertTriangle, Droplets, Eye, Info, LocateFixed, MapPin, Sun, Umbrella, Wind } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { api } from "../api/client"
import type { Weather } from "../api/types"
import { WeatherIcon } from "../components/icons"
import { Button, ErrorState, Loading, Modal, PageHeader, SectionTitle } from "../components/ui"
import { useToast } from "../context/ToastContext"
import { useApi } from "../hooks/useApi"
import { getCurrentPosition } from "../utils/location"

const SUGGESTION_ICONS = { good: Sun, caution: Umbrella, alert: AlertTriangle }

/** Open-Meteo returns local times without a zone ("2026-10-30T19:15"); read them as wall-clock time. */
function localDateTime(value: string) {
  const [date, time = "00:00"] = value.split("T")
  const [y, m, d] = date.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

const clock = (value: string) => localDateTime(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

function headerText(weather: Weather) {
  const now = localDateTime(weather.current.time)
  const day = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
  return weather.source === "open-meteo" ? `${day} · Local time ${clock(weather.current.time)}` : day
}

export default function WeatherPage() {
  const [params, setParams] = useSearchParams()
  const toast = useToast()
  const [picking, setPicking] = useState(false)
  const destinationSlug = params.get("destination")
  const lat = params.get("lat")
  const lng = params.get("lng")
  const hasLocation = Boolean(destinationSlug || (lat && lng))

  const destinations = useApi(() => api.destinations.list({ sort: "popular", limit: 50 }), [])
  const weather = useApi(
    () =>
      hasLocation
        ? api.weather.get({
            destination: destinationSlug ?? undefined,
            lat: lat ? Number(lat) : undefined,
            lng: lng ? Number(lng) : undefined,
            name: params.get("name") ?? undefined,
          })
        : Promise.resolve(null),
    [params.toString()],
  )

  useEffect(() => {
    const first = destinations.data?.items[0]
    if (!hasLocation && first) setParams({ destination: first.slug }, { replace: true })
  }, [hasLocation, destinations.data, setParams])

  async function pickCurrentLocation() {
    try {
      const position = await getCurrentPosition()
      setParams({ lat: position.lat.toFixed(4), lng: position.lng.toFixed(4), name: "your location" })
      setPicking(false)
    } catch (error) {
      toast((error as Error).message, "error")
    }
  }

  const w = weather.data
  const SuggestionIcon = w ? SUGGESTION_ICONS[w.suggestion.level] : Sun

  return (
    <main className="page weather-page">
      <PageHeader
        title={w ? `Weather in ${w.location.name ?? "this area"}` : "Weather"}
        text={w ? headerText(w) : "Checking the latest forecast…"}
        action={
          <Button variant="outline" onClick={() => setPicking(true)}>
            <MapPin size={17} /> Change location
          </Button>
        }
      />

      {weather.error ? (
        <div className="container">
          <ErrorState error={weather.error} retry={weather.reload} />
        </div>
      ) : !w ? (
        <Loading />
      ) : (
        <>
          <div className="container current-weather">
            <div>
              <span className="eyebrow light">Current conditions</span>
              <div className="weather-temp">{w.current.temperature}°</div>
              <h2>{w.current.condition}</h2>
              <p>
                Feels like {w.current.feelsLike}° · High {w.today.high}° / Low {w.today.low}°
                {w.today.sunrise && w.today.sunset && (
                  <>
                    <br />
                    Sunrise {clock(w.today.sunrise)} · Sunset {clock(w.today.sunset)}
                  </>
                )}
              </p>
            </div>
            <WeatherIcon name={w.current.icon} className="weather-hero-icon" />
            <div className="weather-metrics">
              <span>
                <Droplets />
                Humidity<strong>{w.current.humidity}%</strong>
              </span>
              <span>
                <Wind />
                Wind<strong>{w.current.windSpeed} km/h</strong>
              </span>
              <span>
                <Eye />
                Visibility<strong>{w.current.visibilityKm != null ? `${w.current.visibilityKm} km` : "—"}</strong>
              </span>
            </div>
          </div>

          <section className="container forecast-section">
            <SectionTitle title="7-day forecast" text="Plan the week ahead." />
            <div className="forecast-grid">
              {w.daily.map((day, index) => (
                <article className={index === 0 ? "active" : ""} key={day.date}>
                  <strong>{index === 0 ? "Today" : localDateTime(day.date).toLocaleDateString("en-US", { weekday: "short" })}</strong>
                  <WeatherIcon name={day.icon} />
                  <span>
                    {day.high}° <em>{day.low}°</em>
                  </span>
                  <small>{day.condition}</small>
                  <small className="rain">{day.precipitationChance}% rain</small>
                </article>
              ))}
            </div>
          </section>

          <section className={`container travel-suggestion ${w.suggestion.level}`}>
            <span>
              <SuggestionIcon />
            </span>
            <div>
              <strong>{w.suggestion.title}</strong>
              <p>{w.suggestion.text}</p>
            </div>
          </section>
          <p className="container source-note">
            <Info size={14} />
            {w.source === "open-meteo"
              ? "Live forecast from Open-Meteo, updated every 10 minutes."
              : "Live weather is unavailable, so this is an estimated forecast."}
          </p>
        </>
      )}

      {picking && (
        <Modal title="Change location" close={() => setPicking(false)}>
          <Button variant="outline" icon={<LocateFixed size={17} />} onClick={pickCurrentLocation}>
            Use my current location
          </Button>
          <div className="location-options">
            {destinations.data?.items.map((d) => (
              <button
                key={d.id}
                className={d.slug === destinationSlug ? "active" : ""}
                onClick={() => {
                  setParams({ destination: d.slug })
                  setPicking(false)
                }}
              >
                {d.name}
                <small>{d.location}</small>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </main>
  )
}
