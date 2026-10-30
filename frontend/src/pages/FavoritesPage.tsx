import { useState } from "react"
import { Heart, MapPin, Navigation, Star } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { api } from "../api/client"
import DestinationCard from "../components/DestinationCard"
import { PlaceIcon } from "../components/icons"
import { Button, EmptyState, ErrorState, Loading, PageHeader } from "../components/ui"
import { useFavorites } from "../context/FavoritesContext"
import { useApi } from "../hooks/useApi"
import { directionsLink } from "./NearbyPage"

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { isSaved, toggle, ready } = useFavorites()
  const [tab, setTab] = useState<"destinations" | "places">("destinations")
  const favorites = useApi(() => api.favorites.list(), [])

  // Items un-saved on this page disappear immediately (the context is updated optimistically).
  const destinations = favorites.data?.destinations.filter((d) => isSaved("destination", d.id)) ?? []
  const places = favorites.data?.places.filter((p) => isSaved("place", Number(p.id))) ?? []

  return (
    <main className="page">
      <PageHeader title="Your favorites" text="All the places that caught your eye, saved for later." />
      <div className="container favorites-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "destinations"} className={tab === "destinations" ? "active" : ""} onClick={() => setTab("destinations")}>
          Destinations <span>{destinations.length}</span>
        </button>
        <button role="tab" aria-selected={tab === "places"} className={tab === "places" ? "active" : ""} onClick={() => setTab("places")}>
          Places <span>{places.length}</span>
        </button>
      </div>

      {favorites.error ? (
        <div className="container">
          <ErrorState error={favorites.error} retry={favorites.reload} />
        </div>
      ) : !favorites.data || !ready ? (
        <Loading />
      ) : tab === "destinations" ? (
        destinations.length ? (
          <div className="container destination-grid">
            {destinations.map((item) => (
              <DestinationCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="container">
            <EmptyState
              icon={<Heart />}
              title="No saved destinations yet"
              text="Tap the heart on any destination and it’ll be waiting here when you’re ready."
              action={<Button onClick={() => navigate("/explore")}>Explore destinations</Button>}
            />
          </div>
        )
      ) : places.length ? (
        <div className="container">
          <section className="place-list">
            {places.map((place) => (
              <article className="place-row" key={place.id} onClick={() => navigate(directionsLink(place))}>
                <span className="place-icon">
                  <PlaceIcon category={place.category} />
                </span>
                <div>
                  <h3>{place.name}</h3>
                  <p>
                    {place.type}
                    {place.destinationName && ` · near ${place.destinationName}`}
                  </p>
                  {place.rating ? (
                    <span className="rating">
                      <Star size={14} fill="currentColor" />
                      {place.rating.toFixed(1)}
                    </span>
                  ) : null}
                </div>
                <div className="actions">
                  <button
                    className="icon-button saved"
                    onClick={(event) => {
                      event.stopPropagation()
                      toggle("place", Number(place.id), place.name)
                    }}
                    aria-label={`Remove ${place.name} from favorites`}
                  >
                    <Heart size={18} fill="currentColor" />
                  </button>
                  <button className="icon-button" aria-label={`Directions to ${place.name}`}>
                    <Navigation size={19} />
                  </button>
                </div>
              </article>
            ))}
          </section>
        </div>
      ) : (
        <div className="container">
          <EmptyState
            icon={<MapPin />}
            title="No saved places yet"
            text="Save restaurants, hotels and other useful spots from the Nearby page."
            action={<Button onClick={() => navigate("/nearby")}>Find nearby places</Button>}
          />
        </div>
      )}
    </main>
  )
}
