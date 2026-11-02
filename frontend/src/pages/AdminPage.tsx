import { useState, type FormEvent } from "react"
import { Edit3, Plus, Search, Star, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { api, ApiError } from "../api/client"
import type { Category, Destination, DestinationInput, Region } from "../api/types"
import { Button, ErrorState, Field, Loading, Modal, PageHeader, SelectField, TextAreaField } from "../components/ui"
import { useToast } from "../context/ToastContext"
import { useApi } from "../hooks/useApi"



type FormState = Record<
  "name" | "location" | "country" | "region" | "category" | "tag" | "summary" | "description" | "imageUrl" | "gallery" | "latitude" | "longitude" | "bestTime" | "entryFee" | "openingHours" | "gettingThere" | "localTip" | "avgCost",
  string
>

function toForm(d?: Destination): FormState {
  return {
    name: d?.name ?? "",
    location: d?.location ?? "",
    country: d?.country ?? "Bangladesh",
    region: d?.region ?? "Asia",
    category: d?.category ?? "Nature",
    tag: d?.tag ?? "",
    summary: d?.summary ?? "",
    description: d?.description ?? "",
    imageUrl: d?.imageUrl ?? "",
    gallery: d?.gallery.join("\n") ?? "",
    latitude: d ? String(d.latitude) : "",
    longitude: d ? String(d.longitude) : "",
    bestTime: d?.bestTime ?? "",
    entryFee: d?.entryFee ?? "",
    openingHours: d?.openingHours ?? "",
    gettingThere: d?.gettingThere ?? "",
    localTip: d?.localTip ?? "",
    avgCost: d ? String(d.avgCost) : "",
  }
}

function DestinationModal({ destination, close, saved }: { destination?: Destination; close: () => void; saved: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState<FormState>(toForm(destination))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const set = (key: keyof FormState) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setErrors({})
    const optional = (value: string) => value.trim() || null
    const body: Partial<DestinationInput> = {
      name: form.name.trim(),
      location: form.location.trim(),
      country: form.country.trim(),
      region: form.region as Region,
      category: form.category as Category,
      tag: optional(form.tag),
      summary: optional(form.summary),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      gallery: form.gallery.split("\n").map((url) => url.trim()).filter(Boolean),
      latitude: form.latitude === "" ? undefined : Number(form.latitude),
      longitude: form.longitude === "" ? undefined : Number(form.longitude),
      bestTime: optional(form.bestTime),
      entryFee: optional(form.entryFee),
      openingHours: optional(form.openingHours),
      gettingThere: optional(form.gettingThere),
      localTip: optional(form.localTip),
      avgCost: form.avgCost === "" ? undefined : Number(form.avgCost),
    }
    try {
      if (destination) await api.destinations.update(destination.id, body)
      else await api.destinations.create(body)
      toast(destination ? `${body.name} updated` : `${body.name} added`)
      saved()
    } catch (error) {
      if (error instanceof ApiError && error.details) setErrors(error.details)
      else toast((error as Error).message, "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={destination ? `Edit ${destination.name}` : "Add a destination"} close={close} wide>
      <form onSubmit={submit} className="form-grid" noValidate>
        {Object.keys(errors).length > 0 && (
          <div className="form-error span-2" role="alert">
            Please fix the highlighted fields.
          </div>
        )}
        <Field label="Name" value={form.name} onChange={set("name")} error={errors.name} />
        <Field label="Location" placeholder="e.g. Sylhet, Bangladesh" value={form.location} onChange={set("location")} error={errors.location} />
        <Field label="Country" value={form.country} onChange={set("country")} error={errors.country} />
        <SelectField label="Region" value={form.region} onChange={set("region")} error={errors.region} options={REGIONS.map((r) => ({ value: r, label: r }))} />
        <SelectField label="Category" value={form.category} onChange={set("category")} error={errors.category} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
        <Field label="Tag" placeholder="e.g. Swamp forest" value={form.tag} onChange={set("tag")} error={errors.tag} />
        <Field className="span-2" label="Headline" placeholder="A short, inviting summary" value={form.summary} onChange={set("summary")} error={errors.summary} />
        <TextAreaField className="span-2" label="Description" rows={4} value={form.description} onChange={set("description")} error={errors.description} />
        <Field className="span-2" label="Main image URL" placeholder="https://…" value={form.imageUrl} onChange={set("imageUrl")} error={errors.imageUrl} />
        <TextAreaField className="span-2" label="Gallery image URLs (one per line)" rows={2} value={form.gallery} onChange={set("gallery")} error={errors.gallery} />
        <Field label="Latitude" type="number" step="any" value={form.latitude} onChange={set("latitude")} error={errors.latitude} />
        <Field label="Longitude" type="number" step="any" value={form.longitude} onChange={set("longitude")} error={errors.longitude} />
        <Field label="Best time to visit" value={form.bestTime} onChange={set("bestTime")} error={errors.bestTime} />
        <Field label="Entry fee" value={form.entryFee} onChange={set("entryFee")} error={errors.entryFee} />
        <Field label="Opening hours" value={form.openingHours} onChange={set("openingHours")} error={errors.openingHours} />
        <Field label="Estimated trip cost (USD)" type="number" min={0} value={form.avgCost} onChange={set("avgCost")} error={errors.avgCost} />
        <Field className="span-2" label="Getting there" value={form.gettingThere} onChange={set("gettingThere")} error={errors.gettingThere} />
        <TextAreaField className="span-2" label="Local tip" rows={2} value={form.localTip} onChange={set("localTip")} error={errors.localTip} />
        <div className="modal-actions span-2">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {destination ? "Save changes" : "Add destination"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const stats = useApi(() => api.admin.stats(), [])
  const list = useApi(() => api.destinations.list({ sort: "newest", limit: 50 }), [])
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState<{ destination?: Destination } | null>(null)

  async function remove(destination: Destination) {
    if (!window.confirm(`Delete ${destination.name}? Its reviews will also be removed.`)) return
    try {
      await api.destinations.remove(destination.id)
      toast(`${destination.name} deleted`)
      list.reload()
      stats.reload()
    } catch (error) {
      toast((error as Error).message, "error")
    }
  }

  const term = search.trim().toLowerCase()
  const items = (list.data?.items ?? []).filter(
    (d) => !term || `${d.name} ${d.location} ${d.category}`.toLowerCase().includes(term),
  )

  return (
    <main className="page">
      <PageHeader
        title="Admin dashboard"
        text="Manage destinations and keep an eye on Tripza."
        action={
          <Button icon={<Plus size={18} />} onClick={() => setModal({})}>
            Add destination
          </Button>
        }
      />
      <div className="container budget-summary admin-stats">
        {(["users", "destinations", "reviews", "trips", "subscribers"] as const).map((key) => (
          <article key={key}>
            <small>{key.toUpperCase()}</small>
            <strong>{stats.data ? stats.data[key].toLocaleString() : "—"}</strong>
          </article>
        ))}
      </div>
      <div className="container">
        <div className="table-tools">
          <Field placeholder="Search destinations" icon={<Search size={18} />} value={search} onChange={setSearch} />
          <span className="hint">{items.length} shown</span>
        </div>
        {list.error ? (
          <ErrorState error={list.error} retry={list.reload} />
        ) : !list.data ? (
          <Loading />
        ) : (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Destination</th>
                  <th>Category</th>
                  <th>Region</th>
                  <th>Rating</th>
                  <th>Est. cost</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="cell-title">
                        <img src={d.imageUrl} alt="" />
                        <div>
                          <button className="link-button" onClick={() => navigate(`/destinations/${d.slug}`)}>
                            {d.name}
                          </button>
                          <small>{d.location}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="pill">{d.category}</span>
                    </td>
                    <td>{d.region}</td>
                    <td>
                      {d.reviewCount ? (
                        <span className="rating">
                          <Star size={14} fill="currentColor" /> {d.rating.toFixed(1)} <small className="hint">({d.reviewCount})</small>
                        </span>
                      ) : (
                        <span className="hint">No reviews</span>
                      )}
                    </td>
                    <td>${d.avgCost.toLocaleString()}</td>
                    <td>
                      <div className="card-actions">
                        <button className="icon-button" aria-label={`Edit ${d.name}`} onClick={() => setModal({ destination: d })}>
                          <Edit3 size={16} />
                        </button>
                        <button className="icon-button" aria-label={`Delete ${d.name}`} onClick={() => remove(d)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && (
        <DestinationModal
          destination={modal.destination}
          close={() => setModal(null)}
          saved={() => {
            setModal(null)
            list.reload()
            stats.reload()
          }}
        />
      )}
    </main>
  )
}
