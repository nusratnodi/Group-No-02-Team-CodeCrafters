import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ArrowLeft, ArrowRight, LocateFixed, MapPin } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { api } from "../api/client"
import type { GeocodeResult, Route, TravelMode } from "../api/types"
import { MODE_ICONS } from "../components/icons"
import MapView, { type MapMarker } from "../components/MapView"
import { Button, Field } from "../components/ui"
import { useToast } from "../context/ToastContext"
import { formatLatLng, getCurrentPosition } from "../utils/location"

interface Point {
  name: string
  lat: number
  lng: number
  slug?: string
}

const MODES: TravelMode[] = ["car", "bus", "walk"]
const ROUTE_TITLES: Record<TravelMode, string> = { car: "Fastest route", bus: "By bus (estimated)", walk: "Walking route" }

/** A text field that suggests destinations and addresses as the traveler types. */
function PlaceSearchField({
  label,
  icon,
  placeholder,
  value,
  onSelect,
}: {
  label: string
  icon: ReactNode
  placeholder: string
  value: Point | null
  onSelect: (point: Point) => void
}) {
  const [text, setText] = useState(value?.name ?? "")
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setText(value?.name ?? "")
  }, [value])

  useEffect(() => {
    const query = text.trim()
    if (!open || query.length < 2 || query === value?.name) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      api.navigation
        .geocode(query)
        .then(({ results }) => setResults(results))
        .catch(() => setResults([]))
    }, 350)
    return () => clearTimeout(timer)
  }, [text, open, value])

  return (
    <div className="field-wrap relative">
      <Field
        label={label}
        placeholder={placeholder}
        icon={icon}
        value={text}
        onChange={(next) => {
          setText(next)
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <div className="suggestions" role="listbox" aria-label={`${label} suggestions`}>
          {results.map((result) => (
            <button
              key={`${result.type}-${result.lat}-${result.lng}`}
              role="option"
              aria-selected={false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect({ name: result.name, lat: result.lat, lng: result.lng, slug: result.slug })
                setOpen(false)
                setResults([])
              }}
            >
              {result.name}
              <small>{result.type === "destination" ? `Tripza destination · ${result.label}` : result.label}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RoutePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [destination, setDestination] = useState<Point | null>(null)
  const [from, setFrom] = useState<Point | null>(null)
  const [mode, setMode] = useState<TravelMode>("car")
  const [route, setRoute] = useState<Route | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [locating, setLocating] = useState(false)
  const isDesktop = useMemo(() => window.matchMedia?.("(min-width: 901px)").matches ?? true, [])

  useEffect(() => {
    const slug = params.get("to")
    if (slug) {
      api.destinations
        .get(slug)
        .then(({ destination: d }) => setDestination({ name: d.name, lat: d.latitude, lng: d.longitude, slug: d.slug }))
        .catch((err: Error) => setError(err.message))
      return
    }
    const lat = Number(params.get("toLat"))
    const lng = Number(params.get("toLng"))
    if (params.get("toLat") && Number.isFinite(lat) && Number.isFinite(lng)) {
      setDestination({ name: params.get("toName") || "Selected place", lat, lng })
    }
  }, [params])

  useEffect(() => {
    if (!from || !destination) {
      setRoute(null)
      return
    }
    let active = true
    setLoading(true)
    setError("")
    api.navigation
      .route({ from: formatLatLng(from), to: formatLatLng(destination), mode })
      .then(({ route }) => active && setRoute(route))
      .catch((err: Error) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [from, destination, mode])

  async function locateMe() {
    setLocating(true)
    try {
      const position = await getCurrentPosition()
      setFrom({ name: "My location", ...position })
    } catch (err) {
      toast((err as Error).message, "error")
    } finally {
      setLocating(false)
    }
  }

  const markers: MapMarker[] = []
  if (from) markers.push({ id: "start", lat: from.lat, lng: from.lng, kind: "start", text: "A", label: from.name })
  if (destination) markers.push({ id: "end", lat: destination.lat, lng: destination.lng, kind: "end", text: "B", label: destination.name })
  const ModeIcon = MODE_ICONS[mode]

  return (
    <main className="map-page">
      <div className="map-canvas">
        <MapView markers={markers} route={route?.geometry} zoom={12} padLeft={isDesktop ? 414 : 0} />
        <button className="locate" onClick={locateMe} aria-label="Use my current location" disabled={locating}>
          <LocateFixed />
        </button>
      </div>
      <aside className="route-panel">
        <button className="back" onClick={() => (destination?.slug ? navigate(`/destinations/${destination.slug}`) : navigate(-1))}>
          <ArrowLeft size={18} /> {destination?.slug ? "Destination" : "Back"}
        </button>
        <h1>Plan your route</h1>
        <p>We’ll find the smoothest way there.</p>
        <div className="route-fields">
          <div>
            <PlaceSearchField
              label="Starting point"
              placeholder="Search a city, station or address"
              icon={<span className="dot start-dot" />}
              value={from}
              onSelect={setFrom}
            />
            <button className="link-button" onClick={locateMe} disabled={locating}>
              <LocateFixed size={15} /> {locating ? "Finding you…" : "Use my current location"}
            </button>
          </div>
          <PlaceSearchField
            label="Destination"
            placeholder="Where are you going?"
            icon={<MapPin size={18} />}
            value={destination}
            onSelect={setDestination}
          />
        </div>
        <div className="mode-tabs" role="tablist" aria-label="Travel mode">
          {MODES.map((id) => {
            const Icon = MODE_ICONS[id]
            return (
              <button key={id} role="tab" aria-selected={mode === id} className={mode === id ? "active" : ""} onClick={() => setMode(id)}>
                <Icon size={21} />
                <span>{id}</span>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="form-error" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}
        {route && from && destination ? (
          <article className="route-card" aria-busy={loading}>
            <div>
              <span className="route-icon">
                <ModeIcon />
              </span>
              <div>
                <strong>{ROUTE_TITLES[mode]}</strong>
                <small>{route.via ? `Via ${route.via}` : `${from.name} → ${destination.name}`}</small>
              </div>
            </div>
            <strong>{loading ? "…" : route.durationText}</strong>
            <div className="route-meta">
              {route.notes.map((note) => (
                <span key={note}>{note}</span>
              ))}
            </div>
          </article>
        ) : (
          <article className="route-card empty">
            {loading ? "Finding the best route…" : from ? "Choose a destination to see the route." : "Choose a starting point to see the route."}
          </article>
        )}
        <Button className="wide" disabled={!route} onClick={() => route && window.open(route.navigationUrl, "_blank", "noopener")}>
          Start navigation <ArrowRight size={18} />
        </Button>
      </aside>
    </main>
  )
}
