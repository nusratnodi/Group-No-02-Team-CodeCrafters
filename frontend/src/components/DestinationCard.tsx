import { Heart, MapPin, Star } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { Destination } from "../api/types"
import { useFavorites } from "../context/FavoritesContext"

export default function DestinationCard({ item }: { item: Destination }) {
  const navigate = useNavigate()
  const { isSaved, toggle } = useFavorites()
  const saved = isSaved("destination", item.id)
  const open = () => navigate(`/destinations/${item.slug}`)

  return (
    <article
      className="destination-card"
      onClick={open}
      onKeyDown={(event) => event.key === "Enter" && event.target === event.currentTarget && open()}
      tabIndex={0}
      aria-label={`${item.name}, ${item.location}`}
    >
      <div className="card-image">
        <img src={item.imageUrl} alt={`${item.name} destination`} loading="lazy" />
        <button
          className={saved ? "save-button saved" : "save-button"}
          onClick={(event) => {
            event.stopPropagation()
            toggle("destination", item.id, item.name)
          }}
          aria-label={saved ? `Remove ${item.name} from favorites` : `Save ${item.name} to favorites`}
          aria-pressed={saved}
        >
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
        {item.tag && <span className="image-tag">{item.tag}</span>}
      </div>
      <div className="card-body">
        <div>
          <h3>{item.name}</h3>
          <p>
            <MapPin size={15} />
            {item.location}
          </p>
        </div>
        {item.reviewCount > 0 && (
          <span className="rating" title={`${item.reviewCount} reviews`}>
            <Star size={15} fill="currentColor" />
            {item.rating.toFixed(1)}
          </span>
        )}
      </div>
    </article>
  )
}
