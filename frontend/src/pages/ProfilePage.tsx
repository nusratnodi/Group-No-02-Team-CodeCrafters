import { useState, type FormEvent } from "react"
import { ArrowRight, CalendarPlus, Heart, KeyRound, LayoutDashboard, LogOut, MapPin, Star, WalletCards } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { api, ApiError } from "../api/client"
import type { Trip } from "../api/types"
import { Button, EmptyState, Field, Loading, Modal, PageHeader, TextAreaField } from "../components/ui"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useApi } from "../hooks/useApi"
import { daysUntil, formatDateRange, initials, plural, toIsoDate } from "../utils/format"

const FALLBACK_TRIP_IMAGE = "https://images.unsplash.com/photo-1669562450616-6dbc7c33243c?auto=format&fit=crop&w=400&q=70"

function tripLabel(trip: Trip) {
  const days = daysUntil(trip.startDate)
  if (days > 1) return `In ${days} days`
  if (days === 1) return "Tomorrow"
  if (days === 0) return "Starts today"
  return "Happening now"
}

function EditProfileModal({ close }: { close: () => void }) {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user?.name ?? "")
  const [location, setLocation] = useState(user?.location ?? "")
  const [bio, setBio] = useState(user?.bio ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length < 2) {
      setErrors({ name: "Please enter your name (at least 2 characters)" })
      return
    }
    setBusy(true)
    try {
      const result = await api.users.update({ name: name.trim(), location: location.trim(), bio: bio.trim() })
      setUser(result.user)
      toast("Profile updated")
      close()
    } catch (error) {
      if (error instanceof ApiError && error.details) setErrors(error.details)
      else toast((error as Error).message, "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Edit profile" close={close}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 17 }} noValidate>
        <Field label="Full name" value={name} onChange={setName} error={errors.name} autoComplete="name" />
        <Field label="Home city" placeholder="e.g. Dhaka, Bangladesh" icon={<MapPin size={18} />} value={location} onChange={setLocation} error={errors.location} />
        <TextAreaField label="About you" placeholder="What kind of traveler are you?" rows={3} value={bio} onChange={setBio} error={errors.bio} />
        <div className="modal-actions">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            Save profile
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function ChangePasswordModal({ close }: { close: () => void }) {
  const toast = useToast()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found: Record<string, string> = {}
    if (!current) found.currentPassword = "Enter your current password"
    if (next.length < 8) found.newPassword = "Use at least 8 characters"
    else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(next)) found.newPassword = "Include at least one letter and one number"
    if (confirm !== next) found.confirm = "Passwords do not match"
    setErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    try {
      await api.users.changePassword(current, next)
      toast("Password changed")
      close()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setErrors({ currentPassword: error.message })
      else if (error instanceof ApiError && error.details) setErrors(error.details)
      else toast((error as Error).message, "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Change password" close={close}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 17 }} noValidate>
        <Field label="Current password" type="password" value={current} onChange={setCurrent} error={errors.currentPassword} autoComplete="current-password" />
        <Field label="New password" type="password" placeholder="At least 8 characters" value={next} onChange={setNext} error={errors.newPassword} autoComplete="new-password" />
        <Field label="Confirm new password" type="password" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" />
        <div className="modal-actions">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            Update password
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [modal, setModal] = useState<"profile" | "password" | null>(null)
  const profile = useApi(() => api.users.me(), [user])
  const trips = useApi(() => api.trips.list().then((r) => r.items), [])

  if (!user || !profile.data) return <Loading />
  const { stats } = profile.data
  const today = toIsoDate(new Date())
  const upcoming = (trips.data ?? []).filter((trip) => trip.endDate >= today)

  return (
    <main className="page">
      <PageHeader
        title="My profile"
        text="Manage your travel story and account."
        action={
          <Button variant="outline" onClick={() => setModal("profile")}>
            Edit profile
          </Button>
        }
      />
      <div className="container profile-grid">
        <aside className="profile-card">
          <div className="profile-avatar">{initials(user.name)}</div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          {user.location && (
            <span>
              <MapPin size={15} /> {user.location}
            </span>
          )}
          {user.bio && <p className="bio">{user.bio}</p>}
          <div className="profile-stats">
            <strong>
              {stats.trips}
              <small>Trips</small>
            </strong>
            <strong>
              {stats.favorites}
              <small>Saved</small>
            </strong>
            <strong>
              {stats.reviews}
              <small>Reviews</small>
            </strong>
          </div>
          <nav className="profile-actions" aria-label="Account">
            <Button variant="outline" className="btn-sm" icon={<KeyRound size={15} />} onClick={() => setModal("password")}>
              Change password
            </Button>
            {user.role === "admin" && (
              <Button variant="outline" className="btn-sm" icon={<LayoutDashboard size={15} />} onClick={() => navigate("/admin")}>
                Admin dashboard
              </Button>
            )}
            <Button
              variant="ghost"
              className="btn-sm"
              icon={<LogOut size={15} />}
              onClick={() => {
                logout()
                toast("You have been logged out", "info")
                navigate("/")
              }}
            >
              Log out
            </Button>
          </nav>
        </aside>
        <section className="profile-content">
          <h2>My upcoming trips</h2>
          {!trips.data ? (
            <Loading />
          ) : upcoming.length === 0 ? (
            <EmptyState
              compact
              icon={<CalendarPlus />}
              title="No upcoming trips"
              text="Create a trip budget to start planning your next adventure."
              action={<Button onClick={() => navigate("/expenses?new=1")}>Plan a trip</Button>}
            />
          ) : (
            upcoming.map((trip) => (
              <article className="trip-row" key={trip.id}>
                <img src={trip.destinationImage ?? FALLBACK_TRIP_IMAGE} alt={trip.destinationName ?? trip.name} />
                <div>
                  <span className="eyebrow">{tripLabel(trip)}</span>
                  <h3>{trip.name}</h3>
                  <p>
                    {formatDateRange(trip.startDate, trip.endDate)} · {plural(trip.summary?.days ?? 1, "day")}
                  </p>
                </div>
                <Button variant="outline" onClick={() => navigate(`/expenses?trip=${trip.id}`)}>
                  View budget
                </Button>
              </article>
            ))
          )}
          <h2>Your activity</h2>
          <div className="activity-grid">
            <button onClick={() => navigate("/favorites")}>
              <Heart />
              <span>
                <strong>Saved places</strong>
                <small>{plural(stats.favorites, "saved item")}</small>
              </span>
              <ArrowRight />
            </button>
            <button onClick={() => navigate("/reviews?mine=1")}>
              <Star />
              <span>
                <strong>My reviews</strong>
                <small>{plural(stats.reviews, "shared experience")}</small>
              </span>
              <ArrowRight />
            </button>
            <button onClick={() => navigate("/expenses")}>
              <WalletCards />
              <span>
                <strong>Trip budgets</strong>
                <small>{plural(stats.trips, "trip budget")}</small>
              </span>
              <ArrowRight />
            </button>
          </div>
        </section>
      </div>
      {modal === "profile" && <EditProfileModal close={() => setModal(null)} />}
      {modal === "password" && <ChangePasswordModal close={() => setModal(null)} />}
    </main>
  )
}
