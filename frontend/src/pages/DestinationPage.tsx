import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  CreditCard,
  ExternalLink,
  Heart,
  MapPin,
  MapPinOff,
  Navigation,
  Star,
  Sun,
  Umbrella,
  WalletCards,
  Wind,
} from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { api, ApiError } from "../api/client"
import { PlaceIcon, WeatherIcon } from "../components/icons"
import MapView from "../components/MapView"
import ReviewCard from "../components/ReviewCard"
import { Button, EmptyState, ErrorState, Loading, Modal } from "../components/ui"
import { useFavorites } from "../context/FavoritesContext"
import { useApi } from "../hooks/useApi"
import { formatDistance, plural } from "../utils/format"

export default function DestinationPage() {
  const { slug = "" } = useParams()
  const navigate = useNavigate()
  const { isSaved, toggle } = useFavorites()
  const [showPhotos, setShowPhotos] = useState(false)

  const destination = useApi(() => api.destinations.get(slug).then((r) => r.destination), [slug])
  const nearby = useApi(() => api.places.nearby({ destination: slug, sort: "rating", limit: 3 }), [slug])
  const reviews = useApi(() => api.reviews.list({ destination: slug, limit: 1 }), [slug])
  const weather = useApi(() => api.weather.get({ destination: slug }), [slug])

  if (destination.loading && !destination.data) return <Loading />
  if (destination.error) {
    return (
      <main className="page container">
        {destination.error instanceof ApiError && destination.error.status === 404 ? (
          <EmptyState
            icon={<MapPinOff />}
            title="Destination not found"
            text="It may have been removed or the link is incorrect."
            action={<Button onClick={() => navigate("/explore")}>Explore destinations</Button>}
          />
        ) : (
          <ErrorState error={destination.error} retry={destination.reload} />
        )}
      </main>
    )
  }

  const d = destination.data!
  const saved = isSaved("destination", d.id)
  const photos = [d.imageUrl, ...d.gallery]
  const galleryClass = photos.length === 1 ? "gallery single" : photos.length === 2 ? "gallery double" : "gallery"
  const summary = reviews.data?.summary
  const latest = reviews.data?.items[0]

  return (
    <main className="page detail-page">
      <div className="container detail-top">
        <button className="back" onClick={() => navigate("/explore")}>
          <ArrowLeft size={18} /> Back to explore
        </button>
        <div className="detail-title">
          <div>
            <span className="eyebrow">{d.tag ?? d.category}</span>
            <h1>{d.name}</h1>
            <p>
              <MapPin size={17} /> {d.location}
              {d.reviewCount > 0 && (
                <>
                  <span>•</span> <Star size={16} fill="currentColor" className="star" /> {d.rating.toFixed(1)} ({plural(d.reviewCount, "review")})
                </>
              )}
            </p>
          </div>
          <div className="detail-actions">
            <Button
              variant="outline"
              onClick={() => toggle("destination", d.id, d.name)}
              icon={<Heart size={18} fill={saved ? "currentColor" : "none"} />}
            >
              {saved ? "Saved" : "Save"}
            </Button>
            <Button onClick={() => navigate(`/route?to=${d.slug}`)} icon={<Navigation size={18} />}>
              Get directions
            </Button>
          </div>
        </div>
        <div className={galleryClass}>
          {photos.slice(0, 3).map((src, index) => (
            <img key={src} className={index === 0 ? "gallery-main" : undefined} src={src} alt={`${d.name} photo ${index + 1}`} />
          ))}
          {photos.length > 1 && <button onClick={() => setShowPhotos(true)}>View all {photos.length} photos</button>}
        </div>
      </div>

      <div className="container detail-layout">
        <div className="detail-content">
          <section className="content-section">
            <h2>{d.summary ?? `About ${d.name}`}</h2>
            <p>{d.description}</p>
          </section>
          <section className="quick-facts" aria-label="Quick facts">
            <article>
              <CalendarDays />
              <span>
                Best time<strong>{d.bestTime ?? "Year-round"}</strong>
              </span>
            </article>
            <article>
              <CreditCard />
              <span>
                Entry fee<strong>{d.entryFee ?? "Not specified"}</strong>
              </span>
            </article>
            <article>
              <Clock />
              <span>
                Opening hours<strong>{d.openingHours ?? "Not specified"}</strong>
              </span>
            </article>
          </section>

          <section className="content-section">
            <div className="title-row">
              <h2>Location & route</h2>
              <Button variant="ghost" onClick={() => navigate(`/route?to=${d.slug}`)}>
                Open full map <ExternalLink size={16} />
              </Button>
            </div>
            <MapView markers={[{ id: d.id, lat: d.latitude, lng: d.longitude, kind: "primary", label: d.name }]} zoom={11} />
            <div className="route-summary">
              <span>
                <Navigation size={18} /> {d.gettingThere ?? d.location}
              </span>
              <Button variant="outline" onClick={() => navigate(`/route?to=${d.slug}`)}>
                Plan route
              </Button>
            </div>
          </section>

          <section className="content-section">
            <div className="title-row">
              <h2>Nearby favorites</h2>
              <Button variant="ghost" onClick={() => navigate(`/nearby?destination=${d.slug}`)}>
                See all <ArrowRight size={16} />
              </Button>
            </div>
            {nearby.data && nearby.data.items.length === 0 ? (
              <p className="hint">No nearby places listed yet.</p>
            ) : (
              <div className="nearby-mini">
                {(nearby.data?.items ?? []).map((place) => (
                  <article key={place.id}>
                    <span>
                      <PlaceIcon category={place.category} />
                    </span>
                    <div>
                      <strong>{place.name}</strong>
                      <small>
                        {place.type}
                        {place.distanceKm !== undefined && ` · ${formatDistance(place.distanceKm)}`}
                      </small>
                    </div>
                    {place.rating ? (
                      <span className="rating">
                        <Star size={13} fill="currentColor" />
                        {place.rating.toFixed(1)}
                      </span>
                    ) : null}
                  </article>
                ))}
                {nearby.loading && [1, 2, 3].map((n) => <div key={n} className="skeleton" style={{ height: 86 }} />)}
              </div>
            )}
          </section>

          <section className="content-section">
            <div className="title-row">
              <div>
                <h2>Traveler reviews</h2>
                <p>
                  {summary && summary.count > 0
                    ? `Rated ${summary.average.toFixed(1)} out of 5 by ${plural(summary.count, "traveler")}.`
                    : "No reviews yet — be the first to share your experience."}
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate(`/reviews?destination=${d.slug}`)}>
                {summary && summary.count > 0 ? "Read reviews" : "Write a review"}
              </Button>
            </div>
            {latest && <ReviewCard review={latest} />}
          </section>
        </div>

        <aside className="detail-sidebar">
          <article className="weather-card">
            {weather.data ? (
              <>
                <div className="title-row">
                  <div>
                    <small>RIGHT NOW</small>
                    <h3>{d.name}</h3>
                  </div>
                  <WeatherIcon name={weather.data.current.icon} size={38} />
                </div>
                <div className="temperature">{weather.data.current.temperature}°</div>
                <p>
                  {weather.data.current.condition} · Feels like {weather.data.current.feelsLike}°
                </p>
                <div>
                  <span>
                    <Wind size={15} /> {weather.data.current.windSpeed} km/h
                  </span>
                  <span>
                    <Umbrella size={15} /> {weather.data.today.precipitationChance}%
                  </span>
                </div>
              </>
            ) : weather.error ? (
              <p>Weather is unavailable right now.</p>
            ) : (
              <div className="skeleton" />
            )}
            <Button variant="light" onClick={() => navigate(`/weather?destination=${d.slug}`)}>
              View 7-day forecast
            </Button>
          </article>
          {d.localTip && (
            <article className="tip-card">
              <span>
                <Sun />
              </span>
              <div>
                <strong>Local tip</strong>
                <p>{d.localTip}</p>
              </div>
            </article>
          )}
          <article className="plan-card">
            <strong>Planning a visit?</strong>
            <p>Create a trip budget for {d.name} and track every expense as you go.</p>
            <Button variant="outline" icon={<WalletCards size={17} />} onClick={() => navigate(`/expenses?new=1&destination=${d.slug}`)}>
              Plan a trip budget
            </Button>
          </article>
        </aside>
      </div>

      {showPhotos && (
        <Modal title={`${d.name} photos`} close={() => setShowPhotos(false)} wide>
          <div className="lightbox-grid">
            {photos.map((src, index) => (
              <img key={src} src={src} alt={`${d.name} photo ${index + 1}`} />
            ))}
          </div>
        </Modal>
      )}
    </main>
  )
}
