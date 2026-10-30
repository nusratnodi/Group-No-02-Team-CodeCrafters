import { useState, type FormEvent } from "react"
import { ChevronDown, Edit3, MessageSquare, Star } from "lucide-react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { api, ApiError } from "../api/client"
import type { Destination, Review } from "../api/types"
import ReviewCard from "../components/ReviewCard"
import { Button, EmptyState, ErrorState, Loading, Modal, PageHeader, SelectField, StarSelect, Stars, TextAreaField } from "../components/ui"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useApi } from "../hooks/useApi"
import { plural } from "../utils/format"

const PAGE_SIZE = 10

function ReviewModal({
  review,
  destinationId,
  destinations,
  close,
  saved,
}: {
  review?: Review
  destinationId?: number
  destinations: Destination[]
  close: () => void
  saved: () => void
}) {
  const toast = useToast()
  const [target, setTarget] = useState(String(review?.destinationId ?? destinationId ?? ""))
  const [rating, setRating] = useState(review?.rating ?? 0)
  const [comment, setComment] = useState(review?.comment ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found: Record<string, string> = {}
    if (!target) found.destinationId = "Choose the destination you visited"
    if (rating < 1) found.rating = "Choose a rating from 1 to 5 stars"
    if (comment.trim().length < 10) found.comment = "Tell us a little more (at least 10 characters)"
    setErrors(found)
    setFormError("")
    if (Object.keys(found).length) return

    setBusy(true)
    try {
      if (review) await api.reviews.update(review.id, { rating, comment: comment.trim() })
      else await api.reviews.create({ destinationId: Number(target), rating, comment: comment.trim() })
      toast(review ? "Review updated" : "Thanks for sharing your experience!")
      saved()
    } catch (error) {
      if (error instanceof ApiError && error.details) setErrors(error.details)
      setFormError((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={review ? "Edit your review" : "Share your experience"} close={close}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 17 }} noValidate>
        {formError && (
          <div className="form-error" role="alert">
            {formError}
          </div>
        )}
        {!review && !destinationId && (
          <SelectField
            label="Destination"
            value={target}
            onChange={setTarget}
            error={errors.destinationId}
            options={[{ value: "", label: "Choose a destination" }, ...destinations.map((d) => ({ value: String(d.id), label: d.name }))]}
          />
        )}
        <div>
          <StarSelect value={rating} onChange={setRating} />
          {errors.rating && <p className="field-error" style={{ textAlign: "center" }}>{errors.rating}</p>}
        </div>
        <TextAreaField
          label="Your review"
          placeholder="What made your visit memorable?"
          rows={5}
          value={comment}
          onChange={setComment}
          error={errors.comment}
        />
        <div className="modal-actions">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {review ? "Save changes" : "Submit review"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function ReviewsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const { user } = useAuth()
  const [pages, setPages] = useState(1)
  const [modal, setModal] = useState<{ review?: Review } | null>(null)

  const slug = params.get("destination") ?? ""
  const mine = params.get("mine") === "1"
  const destinations = useApi(() => api.destinations.list({ sort: "name", limit: 50 }).then((r) => r.items), [])
  const reviews = useApi(() => api.reviews.list({ destination: slug || undefined, mine: mine || undefined, limit: PAGE_SIZE * pages }), [slug, mine, pages, user?.id])
  const destination = destinations.data?.find((d) => d.slug === slug)

  function write() {
    if (!user) {
      toast("Log in to write a review", "info")
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`)
      return
    }
    setModal({})
  }

  async function remove(review: Review) {
    if (!window.confirm("Delete this review?")) return
    try {
      await api.reviews.remove(review.id)
      toast("Review deleted")
      reviews.reload()
    } catch (error) {
      toast((error as Error).message, "error")
    }
  }

  function filterBy(value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set("destination", value)
    else next.delete("destination")
    setParams(next, { replace: true })
    setPages(1)
  }

  const summary = reviews.data?.summary

  return (
    <main className="page">
      <PageHeader
        title={mine ? "My reviews" : "Traveler reviews"}
        text={destination ? `${destination.name} · Real experiences from the Tripza community.` : "Real experiences from the Tripza community."}
        back={slug ? () => navigate(`/destinations/${slug}`) : undefined}
        backLabel="Destination"
        action={
          <Button onClick={write} icon={<Edit3 size={17} />}>
            Write a review
          </Button>
        }
      />
      <div className="container reviews-filter">
        <label className="select-pill" style={{ minHeight: 44 }}>
          <select value={slug} onChange={(event) => filterBy(event.target.value)} aria-label="Filter reviews by destination">
            <option value="">All destinations</option>
            {destinations.data?.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
          <ChevronDown size={16} />
        </label>
      </div>

      {reviews.error ? (
        <div className="container">
          <ErrorState error={reviews.error} retry={reviews.reload} />
        </div>
      ) : !reviews.data ? (
        <Loading />
      ) : summary && summary.count === 0 ? (
        <div className="container">
          <EmptyState
            icon={<MessageSquare />}
            title={mine ? "You haven’t written any reviews yet" : "No reviews yet"}
            text="Be the first to share your experience and help other travelers plan."
            action={<Button onClick={write}>Write a review</Button>}
          />
        </div>
      ) : (
        <>
          <div className="container review-summary">
            <div>
              <strong>{summary!.average.toFixed(1)}</strong>
              <Stars rating={summary!.average} size={20} />
              <p>{plural(summary!.count, "review")}</p>
            </div>
            <div className="rating-bars">
              {[5, 4, 3, 2, 1].map((n) => (
                <span key={n}>
                  {n}
                  <Star size={12} />
                  <i>
                    <b style={{ width: `${summary!.distribution[n] ?? 0}%` }} />
                  </i>
                  <small>{summary!.distribution[n] ?? 0}%</small>
                </span>
              ))}
            </div>
          </div>
          <div className="container reviews-list">
            {reviews.data.items.map((review) => {
              const own = user?.id === review.userId
              return (
                <ReviewCard
                  key={review.id}
                  review={review}
                  showDestination={!slug}
                  onEdit={own ? () => setModal({ review }) : undefined}
                  onDelete={own || user?.role === "admin" ? () => remove(review) : undefined}
                />
              )
            })}
            {reviews.data.items.length < reviews.data.total && (
              <div className="load-more">
                <Button variant="outline" disabled={reviews.loading} onClick={() => setPages(pages + 1)}>
                  Show more reviews
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {modal && (
        <ReviewModal
          review={modal.review}
          destinationId={destination?.id}
          destinations={destinations.data ?? []}
          close={() => setModal(null)}
          saved={() => {
            setModal(null)
            reviews.reload()
          }}
        />
      )}
    </main>
  )
}
