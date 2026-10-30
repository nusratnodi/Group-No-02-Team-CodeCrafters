import { Edit3, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { Review } from "../api/types"
import { initials, timeAgo } from "../utils/format"
import { Stars } from "./ui"

export default function ReviewCard({
  review,
  showDestination = false,
  onEdit,
  onDelete,
}: {
  review: Review
  showDestination?: boolean
  onEdit?: () => void
  onDelete?: () => void
}) {
  const navigate = useNavigate()
  const edited = review.updatedAt !== review.createdAt

  return (
    <article className="review-card">
      <div className="avatar" aria-hidden="true">
        {initials(review.userName)}
      </div>
      <div>
        <div className="review-head">
          <div>
            <strong>{review.userName}</strong>
            <Stars rating={review.rating} />
            {showDestination && (
              <div>
                <button className="review-destination" onClick={() => navigate(`/destinations/${review.destinationSlug}`)}>
                  {review.destinationName}
                </button>
              </div>
            )}
          </div>
          <small>
            {timeAgo(review.createdAt)}
            {edited ? " · edited" : ""}
          </small>
        </div>
        <p>{review.comment}</p>
        {(onEdit || onDelete) && (
          <div className="review-actions">
            {onEdit && (
              <button onClick={onEdit}>
                <Edit3 size={14} /> Edit
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete}>
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
