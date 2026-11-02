import { useState, type FormEvent } from "react"
import { ArrowRight, Bookmark, CalendarDays, CloudSun, Map, MapPin, Search, Sun, WalletCards } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { api } from "../api/client"
import type { Category } from "../api/types"
import DestinationCard from "../components/DestinationCard"
import { CATEGORY_ICONS } from "../components/icons"
import { Footer } from "../components/Layout"
import { Button, SectionTitle } from "../components/ui"
import { useAuth } from "../context/AuthContext"
import { useApi } from "../hooks/useApi"

const HERO_IMAGE = "https://images.unsplash.com/photo-1669562450616-6dbc7c33243c?auto=format&fit=crop&w=1800&q=85"
const CATEGORIES: Category[] = ["Beach", "Mountain", "Historical", "City", "Nature"]
export const PLANNED_DATE_KEY = "tripza.plannedDate"

const features = [
  [Map, "Smart routes", "Clear directions and transport options, wherever you’re headed."],
  [CloudSun, "Weather ready", "Live forecasts help you pack and plan each day better."],
  [WalletCards, "Budget control", "Track spending as you go and stay inside your comfort zone."],
  [Bookmark, "Save what inspires", "Keep favorite places and ideas together for later."],
] as const

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [query, setQuery] = useState("")
  const [date, setDate] = useState("")
  const popular = useApi(() => api.destinations.list({ sort: "recommended", limit: 3 }), [])
  const trending = useApi(() => api.destinations.list({ sort: "popular", limit: 3 }), [])

  function search(event: FormEvent) {
    event.preventDefault()
    try {
      if (date) sessionStorage.setItem(PLANNED_DATE_KEY, date)
    } catch {
      // Remembering the date is only a convenience for the trip form.
    }
    navigate(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : "/explore")
  }

  return (
    <>
      <main>
        <section className="hero">
          <img src={HERO_IMAGE} alt="Clifftop view over a clear blue sea" className="hero-image" />
          <div className="hero-overlay" />
          <div className="hero-content">
            <span className="hero-pill">
              <Sun size={15} /> Your next story starts here
            </span>
            <h1>
              Explore more.
              <br />
              Remember forever.
            </h1>
            <p>Discover extraordinary places, plan every detail, and travel with confidence—all in one place.</p>
            <form className="hero-search" onSubmit={search} role="search">
              <div className="search-main">
                <MapPin />
                <label>
                  <small>Destination</small>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Where do you want to go?"
                    aria-label="Destination"
                  />
                </label>
              </div>
              <div className="search-date">
                <CalendarDays />
                <label>
                  <small>When</small>
                  <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Travel date" />
                </label>
              </div>
              <Button type="submit" icon={<Search size={19} />}>
                Search
              </Button>
            </form>
            {trending.data && trending.data.items.length > 0 && (
              <div className="trending">
                <span>Trending:</span>
                {trending.data.items.map((item) => (
                  <button key={item.id} type="button" onClick={() => navigate(`/destinations/${item.slug}`)}>
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="categories container">
          <SectionTitle eyebrow="Find your vibe" title="Explore by category" />
          <div className="category-row">
            {CATEGORIES.map((label) => {
              const Icon = CATEGORY_ICONS[label]
              return (
                <button className="category-chip" key={label} onClick={() => navigate(`/explore?category=${label}`)}>
                  <Icon size={20} />
                  {label}
                </button>
              )
            })}
          </div>
        </section>

        <section className="popular container">
          <div className="title-row">
            <SectionTitle eyebrow="Handpicked for you" title="Popular destinations" text="Places travelers can’t stop talking about." />
            <Button variant="outline" onClick={() => navigate("/explore")}>
              View all <ArrowRight size={17} />
            </Button>
          </div>
          <div className="destination-grid">
            {popular.data
              ? popular.data.items.map((item) => <DestinationCard key={item.id} item={item} />)
              : [1, 2, 3].map((n) => <div key={n} className="skeleton skeleton-card" />)}
          </div>
        </section>

        <section className="why">
          <div className="container why-grid">
            <div className="why-copy">
              <SectionTitle
                eyebrow="Travel made simple"
                title="Everything your trip needs, in one place"
                text="From the first idea to the journey home, Tripza keeps every useful detail close."
              />
              <Button onClick={() => navigate("/explore")}>
                Start exploring <ArrowRight size={17} />
              </Button>
            </div>
            <div className="feature-grid">
              {features.map(([Icon, title, text]) => (
                <article className="feature-card" key={title}>
                  <span className="feature-icon">
                    <Icon size={22} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cta container">
          <div>
            <span className="eyebrow light">Make it happen</span>
            <h2>Your perfect trip is closer than you think.</h2>
            <p>Save places, build a budget, and get ready to go.</p>
          </div>
          {user ? (
            <Button variant="light" onClick={() => navigate("/expenses")}>
              Plan a trip budget <ArrowRight size={17} />
            </Button>
          ) : (
            <Button variant="light" onClick={() => navigate("/register")}>
              Create free account <ArrowRight size={17} />
            </Button>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
