import { useEffect, useState, type FormEvent } from "react"
import { ChevronDown, Compass, Search, SlidersHorizontal } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { api } from "../api/client"
import type { Destination } from "../api/types"
import DestinationCard from "../components/DestinationCard"
import { Button, EmptyState, ErrorState, Field, PageHeader } from "../components/ui"
import { plural } from "../utils/format"

const PAGE_SIZE = 8

const FILTER_GROUPS = [
  { key: "category", title: "Category", options: [["Beach"], ["Mountain"], ["Historical"], ["City"], ["Nature"]] },
  { key: "region", title: "Location", options: [["Asia"], ["Europe"], ["Americas"]] },
  { key: "budget", title: "Budget", options: [["low", "Under $500"], ["mid", "$500 – $1,500"], ["high", "$1,500+"]] },
] as const

const RATINGS = [
  ["", "Any"],
  ["4", "4.0+"],
  ["4.5", "4.5+"],
] as const

export const SORT_OPTIONS = [
  ["recommended", "Recommended"],
  ["rating", "Top rated"],
  ["popular", "Most reviewed"],
  ["price_low", "Price: low to high"],
  ["price_high", "Price: high to low"],
  ["name", "Name (A–Z)"],
  ["newest", "Newest"],
] as const

export default function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get("q") ?? "")
  const [items, setItems] = useState<Destination[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [showFilters, setShowFilters] = useState(false)
  const [retry, setRetry] = useState(0)

  const list = (key: string) => params.get(key)?.split(",").filter(Boolean) ?? []
  const sort = params.get("sort") ?? "recommended"
  const minRating = params.get("minRating") ?? ""
  const filterKey = params.toString()

  useEffect(() => {
    setQuery(params.get("q") ?? "")
  }, [params])
  useEffect(() => {
    setPage(1)
  }, [filterKey])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(undefined)
    api.destinations
      .list({
        q: params.get("q") ?? undefined,
        category: list("category"),
        region: list("region"),
        budget: list("budget"),
        minRating: minRating ? Number(minRating) : undefined,
        sort,
        page,
        limit: PAGE_SIZE,
      })
      .then((result) => {
        if (!active) return
        setItems((current) => (page === 1 ? result.items : [...current, ...result.items]))
        setTotal(result.total)
      })
      .catch((err: Error) => active && setError(err))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // `filterKey` represents every search param used above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, page, retry])

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  function toggle(key: string, value: string) {
    const current = list(key)
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    update({ [key]: next.join(",") || null })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    update({ q: query.trim() || null })
  }

  const hasFilters = ["q", "category", "region", "budget", "minRating"].some((key) => params.get(key))

  return (
    <main className="page">
      <PageHeader title="Find your next adventure" text="Explore unforgettable places, handpicked for every kind of traveler." />
      <form className="container explore-search" onSubmit={submit} role="search">
        <Field placeholder="Search destinations or cities" icon={<Search size={19} />} value={query} onChange={setQuery} />
        <Button type="submit">Search</Button>
      </form>
      <div className="container explore-layout">
        <aside className={showFilters ? "filters open" : "filters"} aria-label="Filters">
          <div className="filter-title">
            <h3>Filters</h3>
            <button onClick={() => setParams(new URLSearchParams(), { replace: true })}>Reset all</button>
          </div>
          {FILTER_GROUPS.map((group) => (
            <div className="filter-group" key={group.key}>
              <strong>{group.title}</strong>
              {group.options.map((option) => {
                const [value, label = value] = option as readonly [string, string?]
                return (
                  <label key={value}>
                    <input type="checkbox" checked={list(group.key).includes(value)} onChange={() => toggle(group.key, value)} />{" "}
                    <span>{label}</span>
                  </label>
                )
              })}
            </div>
          ))}
          <div className="filter-group">
            <strong>Minimum rating</strong>
            <div className="rating-options">
              {RATINGS.map(([value, label]) => (
                <button key={label} onClick={() => update({ minRating: value || null })} className={minRating === value ? "active" : ""}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>
        <section className="results">
          <div className="results-top">
            <span>
              <strong>{total}</strong> {total === 1 ? "destination" : "destinations"}
              {params.get("q") && <> for “{params.get("q")}”</>}
            </span>
            <div className="toolbar">
              <Button variant="outline" className="btn-sm filter-toggle" icon={<SlidersHorizontal size={15} />} onClick={() => setShowFilters(!showFilters)}>
                Filters
              </Button>
              <label className="select-pill">
                <select value={sort} onChange={(event) => update({ sort: event.target.value === "recommended" ? null : event.target.value })} aria-label="Sort destinations">
                  {SORT_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </label>
            </div>
          </div>

          {error && !items.length ? (
            <ErrorState error={error} retry={() => setRetry((n) => n + 1)} />
          ) : !loading && items.length === 0 ? (
            <EmptyState
              compact
              icon={<Compass />}
              title="No destinations match"
              text="Try a different search or remove some filters."
              action={hasFilters && <Button variant="outline" onClick={() => setParams(new URLSearchParams())}>Clear filters</Button>}
            />
          ) : (
            <>
              <div className="destination-grid two">
                {items.map((item) => (
                  <DestinationCard key={item.id} item={item} />
                ))}
                {loading && [1, 2].map((n) => <div key={`s${n}`} className="skeleton skeleton-card" />)}
              </div>
              {items.length < total && !loading && (
                <div className="load-more">
                  <Button variant="outline" onClick={() => setPage(page + 1)}>
                    Show more ({plural(total - items.length, "more place")})
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}
