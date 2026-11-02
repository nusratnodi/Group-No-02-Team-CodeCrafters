import { useEffect, useState } from "react"
import { ChevronDown, Heart, LocateFixed, MapPinOff, Navigation, Star } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { api } from "../api/client"
import type { LatLng, Place } from "../api/types"
import { PlaceIcon } from "../components/icons"
import MapView, { type MapMarker } from "../components/MapView"
import { EmptyState, ErrorState, Loading, PageHeader } from "../components/ui"
import { useFavorites } from "../context/FavoritesContext"
import { useToast } from "../context/ToastContext"
import { useApi } from "../hooks/useApi"
import { formatDistance } from "../utils/format"
import { getCurrentPosition } from "../utils/location"

const TABS = [
  ["all", "All"],
  ["restaurant", "Restaurants"],
  ["hospital", "Hospitals"],
  ["hotel", "Hotels"],
  ["shopping", "Shopping"],
  ["atm", "ATMs"],
  ["other", "Others"],
] as const
const RADII = [2, 5, 10, 25]
const NEAR_ME = "__me"

export function directionsLink(place: Pick<Place, "latitude" | "longitude" | "name">) {
  const params = new URLSearchParams({ toLat: String(place.latitude), toLng: String(place.longitude), toName: place.name })
  return `/route?${params}`
}

export default function NearbyPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { isSaved, toggle } = useFavorites()
  const [activeId, setActiveId] = useState<Place["id"] | null>(null)
  const [movedTo, setMovedTo] = useState<LatLng | null>(null)

  const category = params.get("category") ?? "all"
  const sort = params.get("sort") ?? "distance"
  const radius = Number(params.get("radius")) || 10
  const destinationSlug = params.get("destination")
  const lat = params.get("lat")
  const lng = params.get("lng")
  const hasLocation = Boolean(destinationSlug || (lat && lng))

  const destinations = useApi(() => api.destinations.list({ sort: "popular", limit: 50 }), [])
  const nearby = useApi(
    () =>
      hasLocation
        ? api.places.nearby({
            destination: destinationSlug ?? undefined,
            lat: lat ? Number(lat) : undefined,
            lng: lng ? Number(lng) : undefined,
            name: params.get("name") ?? undefined,
            category: category === "all" ? undefined : category,
            sort,
            radius,
            limit: 50,
          })
        : Promise.resolve(null),
    [params.toString()],
  )

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
    setActiveId(null)
    setMovedTo(null)
  }

  // With no location chosen yet, start at the most popular destination.
  useEffect(() => {
    const first = destinations.data?.items[0]
    if (!hasLocation && first) update({ destination: first.slug })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLocation, destinations.data])

  useEffect(() => {
    if (activeId !== null) document.querySelector(`[data-place="${activeId}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [activeId])

  async function chooseLocation(value: string) {
    if (value !== NEAR_ME) {
      update({ destination: value, lat: null, lng: null, name: null })
      return
    }
    try {
      const position = await getCurrentPosition()
      update({ destination: null, lat: position.lat.toFixed(5), lng: position.lng.toFixed(5), name: "Your location" })
    } catch (error) {
      toast((error as Error).message, "error")
    }
  }

  const result = nearby.data
  const nearMe = !destinationSlug && params.get("name") === "Your location"
  const centerName = result?.center.name ?? "this area"
  const markers: MapMarker[] = result
    ? [
        {
          id: "center",
          lat: result.center.lat,
          lng: result.center.lng,
          kind: nearMe ? "user" : "primary",
          label: nearMe ? "You are here" : centerName,
        },
        ...result.items.map((place) => ({
          id: place.id,
          lat: place.latitude,
          lng: place.longitude,
          kind: "place" as const,
          label: place.name,
          active: place.id === activeId,
          onClick: () => setActiveId(place.id),
        })),
      ]
    : []

  return (
    <main className="page">
      <PageHeader
        title="What’s nearby"
        text={nearMe ? "Useful places and local favorites near you." : `Useful places and local favorites around ${centerName}.`}
        action={
          <label className="select-pill" style={{ minHeight: 46 }}>
            <select
              aria-label="Choose a location"
              value={destinationSlug ?? (nearMe ? NEAR_ME : "")}
              onChange={(event) => chooseLocation(event.target.value)}
            >
              {!destinationSlug && !nearMe && <option value="">Selected area</option>}
              <option value={NEAR_ME}>📍 Near me</option>
              {destinations.data?.items.map((d) => (
                <option key={d.id} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </label>
        }
      />
      <div className="container tab-scroll" role="tablist" aria-label="Place categories">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={category === id} className={category === id ? "active" : ""} onClick={() => update({ category: id === "all" ? null : id })}>
            {label}
          </button>
        ))}
      </div>
      <div className="container nearby-layout">
        <section className="place-list">
          <div className="results-top">
            <span>
              <strong>{result?.total ?? 0}</strong> places {nearMe ? "near you" : "nearby"}
            </span>
            <div className="toolbar">
              <label className="select-pill">
                <select value={sort} onChange={(event) => update({ sort: event.target.value === "distance" ? null : event.target.value })} aria-label="Sort places">
                  <option value="distance">Nearest</option>
                  <option value="rating">Top rated</option>
                </select>
                <ChevronDown size={16} />
              </label>
              <label className="select-pill">
                <select value={radius} onChange={(event) => update({ radius: event.target.value === "10" ? null : event.target.value })} aria-label="Search radius">
                  {RADII.map((km) => (
                    <option key={km} value={km}>
                      Within {km} km
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </label>
            </div>
          </div>

          {nearby.error ? (
            <ErrorState error={nearby.error} retry={nearby.reload} />
          ) : nearby.loading || !result ? (
            <Loading />
          ) : result.items.length === 0 ? (
            <EmptyState compact icon={<MapPinOff />} title="No places found" text="Try another category or a larger search radius." />
          ) : (
            result.items.map((place) => {
              const saved = typeof place.id === "number" && isSaved("place", place.id)
              return (
                <article
                  key={place.id}
                  data-place={place.id}
                  className={place.id === activeId ? "place-row active" : "place-row"}
                  onClick={() => setActiveId(place.id)}
                >
                  <span className="place-icon">
                    <PlaceIcon category={place.category} />
                  </span>
                  <div>
                    <h3>{place.name}</h3>
                    <p>
                      {place.type}
                      {place.distanceKm !== undefined && ` · ${formatDistance(place.distanceKm)}`}
                    </p>
                    {place.rating ? (
                      <span className="rating">
                        <Star size={14} fill="currentColor" />
                        {place.rating.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  <div className="actions">
                    {typeof place.id === "number" && (
                      <button
                        className={saved ? "icon-button saved" : "icon-button"}
                        onClick={(event) => {
                          event.stopPropagation()
                          toggle("place", place.id as number, place.name)
                        }}
                        aria-label={saved ? `Remove ${place.name} from favorites` : `Save ${place.name}`}
                        aria-pressed={saved}
                      >
                        <Heart size={18} fill={saved ? "currentColor" : "none"} />
                      </button>
                    )}
                    <button
                      className="icon-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(directionsLink(place))
                      }}
                      aria-label={`Directions to ${place.name}`}
                    >
                      <Navigation size={19} />
                    </button>
                  </div>
                </article>
              )
            })
          )}
          {result?.source === "openstreetmap" && <p className="source-note">Live results from OpenStreetMap contributors.</p>}
        </section>
        <section className="nearby-map">
          {result && <MapView markers={markers} zoom={14} onMoved={setMovedTo} />}
          {movedTo && (
            <button
              className="map-float"
              onClick={() => update({ destination: null, lat: movedTo.lat.toFixed(5), lng: movedTo.lng.toFixed(5), name: "Selected area" })}
            >
              <LocateFixed size={18} /> Search this area
            </button>
          )}
        </section>
      </div>
    </main>
  )
}
