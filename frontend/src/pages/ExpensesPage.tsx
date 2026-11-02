import { useEffect, useState, type FormEvent } from "react"
import { CalendarDays, ChevronDown, Edit3, Plus, Trash2, WalletCards } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { api, ApiError } from "../api/client"
import type { Destination, Expense, ExpenseCategory, Trip } from "../api/types"
import { EXPENSE_ICONS } from "../components/icons"
import { Button, EmptyState, ErrorState, Field, Loading, Modal, PageHeader, SelectField, TextAreaField } from "../components/ui"
import { useToast } from "../context/ToastContext"
import { useApi } from "../hooks/useApi"
import { budgetMessage, CATEGORY_COLORS, CURRENCIES, donutGradient, EXPENSE_CATEGORIES, STATUS_COLORS } from "../utils/budget"
import { formatDate, formatDateRange, formatMoney, plural, toIsoDate } from "../utils/format"
import { PLANNED_DATE_KEY } from "./HomePage"

type Errors = Record<string, string>

/** The trip to show first: the next upcoming or ongoing one, otherwise the most recent. */
export function defaultTrip(trips: Trip[], today = toIsoDate(new Date())) {
  return trips.find((trip) => trip.endDate >= today) ?? trips[trips.length - 1]
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number)
  return toIsoDate(new Date(y, m - 1, d + days))
}

interface TripForm {
  name: string
  destinationId: string
  startDate: string
  endDate: string
  budget: string
  currency: string
}

function TripModal({
  trip,
  initial,
  destinations,
  close,
  saved,
  deleted,
}: {
  trip?: Trip
  initial: TripForm
  destinations: Destination[]
  close: () => void
  saved: (trip: Trip) => void
  deleted: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const set = (key: keyof TripForm) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found: Errors = {}
    if (form.name.trim().length < 2) found.name = "Give your trip a name"
    if (!form.startDate) found.startDate = "Choose a start date"
    if (!form.endDate) found.endDate = "Choose an end date"
    else if (form.startDate && form.endDate < form.startDate) found.endDate = "End date must be on or after the start date"
    if (form.budget === "" || Number(form.budget) < 0 || Number.isNaN(Number(form.budget))) found.budget = "Enter a budget of 0 or more"
    setErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    const body = {
      name: form.name.trim(),
      destinationId: form.destinationId ? Number(form.destinationId) : null,
      startDate: form.startDate,
      endDate: form.endDate,
      budget: Number(form.budget),
      currency: form.currency,
    }
    try {
      const result = trip ? await api.trips.update(trip.id, body) : await api.trips.create(body)
      toast(trip ? "Trip updated" : "Trip created — start adding expenses!")
      saved(result.trip)
    } catch (error) {
      if (error instanceof ApiError && error.details) setErrors(error.details)
      else toast((error as Error).message, "error")
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!trip || !window.confirm(`Delete “${trip.name}” and all of its expenses? This cannot be undone.`)) return
    try {
      await api.trips.remove(trip.id)
      toast("Trip deleted")
      deleted()
    } catch (error) {
      toast((error as Error).message, "error")
    }
  }

  return (
    <Modal title={trip ? "Edit trip" : "Plan a new trip"} close={close}>
      <form onSubmit={submit} className="form-grid" noValidate>
        <Field className="span-2" label="Trip name" placeholder="e.g. Cox's Bazar weekend" value={form.name} onChange={set("name")} error={errors.name} />
        <SelectField
          className="span-2"
          label="Destination (optional)"
          value={form.destinationId}
          onChange={set("destinationId")}
          error={errors.destinationId}
          options={[{ value: "", label: "No specific destination" }, ...destinations.map((d) => ({ value: String(d.id), label: d.name }))]}
        />
        <Field label="Start date" type="date" value={form.startDate} onChange={set("startDate")} error={errors.startDate} />
        <Field label="End date" type="date" value={form.endDate} min={form.startDate} onChange={set("endDate")} error={errors.endDate} />
        <Field label="Total budget" type="number" min={0} step="any" placeholder="0" value={form.budget} onChange={set("budget")} error={errors.budget} />
        <SelectField label="Currency" value={form.currency} onChange={set("currency")} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        <div className={trip ? "modal-actions split span-2" : "modal-actions span-2"}>
          {trip && (
            <Button variant="ghost" icon={<Trash2 size={16} />} onClick={remove}>
              Delete trip
            </Button>
          )}
          <div>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {trip ? "Save changes" : "Create trip"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function ExpenseModal({
  tripId,
  currency,
  expense,
  close,
  saved,
}: {
  tripId: number
  currency: string
  expense?: Expense
  close: () => void
  saved: () => void
}) {
  const toast = useToast()
  const [title, setTitle] = useState(expense?.title ?? "")
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "")
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "Transportation")
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? toIsoDate(new Date()))
  const [note, setNote] = useState(expense?.note ?? "")
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found: Errors = {}
    if (title.trim().length < 2) found.title = "Describe the expense (at least 2 characters)"
    if (!(Number(amount) > 0)) found.amount = "Enter an amount greater than 0"
    if (!spentOn) found.spentOn = "Choose a date"
    setErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    const body = { title: title.trim(), amount: Number(amount), category, spentOn, note: note.trim() || null }
    try {
      if (expense) await api.expenses.update(expense.id, body)
      else await api.trips.addExpense(tripId, body)
      toast(expense ? "Expense updated" : `Added ${formatMoney(body.amount, currency)} for ${body.title}`)
      saved()
    } catch (error) {
      if (error instanceof ApiError && error.details) setErrors(error.details)
      else toast((error as Error).message, "error")
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!expense || !window.confirm(`Delete “${expense.title}”?`)) return
    try {
      await api.expenses.remove(expense.id)
      toast("Expense deleted")
      saved()
    } catch (error) {
      toast((error as Error).message, "error")
    }
  }

  return (
    <Modal title={expense ? "Edit expense" : "Add an expense"} close={close}>
      <form onSubmit={submit} className="form-grid" noValidate>
        <Field className="span-2" label="Title" placeholder="What was this for?" value={title} onChange={setTitle} error={errors.title} />
        <Field label={`Amount (${currency})`} type="number" min={0} step="any" placeholder="0.00" value={amount} onChange={setAmount} error={errors.amount} />
        <SelectField
          label="Category"
          value={category}
          onChange={(value) => setCategory(value as ExpenseCategory)}
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        <Field className="span-2" label="Date" type="date" icon={<CalendarDays size={18} />} value={spentOn} onChange={setSpentOn} error={errors.spentOn} />
        <TextAreaField className="span-2" label="Note (optional)" rows={2} placeholder="Any details worth remembering" value={note} onChange={setNote} error={errors.note} />
        <div className={expense ? "modal-actions split span-2" : "modal-actions span-2"}>
          {expense && (
            <Button variant="ghost" icon={<Trash2 size={16} />} onClick={remove}>
              Delete
            </Button>
          )}
          <div>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {expense ? "Save changes" : "Add expense"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default function ExpensesPage() {
  const [params, setParams] = useSearchParams()
  const toast = useToast()
  const trips = useApi(() => api.trips.list().then((r) => r.items), [])
  const destinations = useApi(() => api.destinations.list({ sort: "name", limit: 50 }).then((r) => r.items), [])
  const [tripModal, setTripModal] = useState<{ trip?: Trip; initial: TripForm } | null>(null)
  const [expenseModal, setExpenseModal] = useState<{ expense?: Expense } | null>(null)
  const [filter, setFilter] = useState("")

  const selected = trips.data?.find((t) => t.id === Number(params.get("trip"))) ?? (trips.data ? defaultTrip(trips.data) : undefined)
  const detail = useApi(() => (selected ? api.trips.get(selected.id) : Promise.resolve(null)), [selected?.id])

  function openNewTrip(destination?: Destination) {
    let start = toIsoDate(new Date())
    try {
      const planned = sessionStorage.getItem(PLANNED_DATE_KEY)
      if (planned && planned >= start) start = planned
    } catch {
      // Ignore unavailable storage.
    }
    setTripModal({
      initial: {
        name: destination ? `${destination.name} trip` : "",
        destinationId: destination ? String(destination.id) : "",
        startDate: start,
        endDate: addDays(start, 3),
        budget: "",
        currency: destination?.country === "Bangladesh" ? "BDT" : "USD",
      },
    })
  }

  // Links such as /expenses?new=1&destination=sajek-valley open the new-trip form pre-filled.
  useEffect(() => {
    if (!params.get("new") || !destinations.data) return
    openNewTrip(destinations.data.find((d) => d.slug === params.get("destination")))
    const next = new URLSearchParams(params)
    next.delete("new")
    next.delete("destination")
    setParams(next, { replace: true })
  }, [params, destinations.data, setParams])

  useEffect(() => {
    setFilter("")
  }, [selected?.id])

  async function deleteExpense(expense: Expense) {
    if (!window.confirm(`Delete “${expense.title}”?`)) return
    try {
      await api.expenses.remove(expense.id)
      toast("Expense deleted")
      detail.reload()
    } catch (error) {
      toast((error as Error).message, "error")
    }
  }

  const selectTrip = (id: number) => setParams({ trip: String(id) }, { replace: true })
  const tripModalView = tripModal && (
    <TripModal
      trip={tripModal.trip}
      initial={tripModal.initial}
      destinations={destinations.data ?? []}
      close={() => setTripModal(null)}
      saved={(trip) => {
        setTripModal(null)
        trips.reload()
        detail.reload()
        selectTrip(trip.id)
      }}
      deleted={() => {
        setTripModal(null)
        setParams({}, { replace: true })
        trips.reload()
      }}
    />
  )

  if (trips.error) return <main className="page container"><ErrorState error={trips.error} retry={trips.reload} /></main>
  if (!trips.data) return <Loading />

  if (trips.data.length === 0) {
    return (
      <main className="page">
        <PageHeader title="Trip budget" text="Track transportation, accommodation, food, shopping and other costs." />
        <div className="container">
          <EmptyState
            icon={<WalletCards />}
            title="Plan your first trip budget"
            text="Set a budget for your trip, record what you spend and see where your money goes."
            action={<Button icon={<Plus size={18} />} onClick={() => openNewTrip()}>Create a trip</Button>}
          />
        </div>
        {tripModalView}
      </main>
    )
  }

  const trip = detail.data?.trip ?? selected!
  const summary = detail.data?.summary
  const money = (value: number, digits = 2) => formatMoney(value, trip.currency, digits)
  const expenses = (detail.data?.expenses ?? []).filter((e) => !filter || e.category === filter)

  return (
    <main className="page">
      <PageHeader
        title="Trip budget"
        text={`${trip.name} · ${formatDateRange(trip.startDate, trip.endDate)}`}
        action={
          <Button icon={<Plus size={18} />} onClick={() => setExpenseModal({})}>
            Add expense
          </Button>
        }
      />
      <div className="container tab-scroll" aria-label="Your trips">
        {trips.data.map((t) => (
          <button key={t.id} className={t.id === trip.id ? "active" : ""} onClick={() => selectTrip(t.id)} aria-pressed={t.id === trip.id}>
            {t.name}
          </button>
        ))}
        <button className="new" onClick={() => openNewTrip()}>
          <Plus size={16} /> New trip
        </button>
      </div>

      {!summary ? (
        detail.error ? <div className="container"><ErrorState error={detail.error} retry={detail.reload} /></div> : <Loading />
      ) : (
        <>
          <div className="container budget-summary">
            <article>
              <small>TOTAL BUDGET</small>
              <strong>{money(summary.budget)}</strong>
              <span>For {plural(summary.days, "travel day")}</span>
            </article>
            <article>
              <small>TOTAL SPENT</small>
              <strong>{money(summary.totalSpent)}</strong>
              <span className={summary.status === "over" ? "danger" : summary.status === "warning" ? "warning" : undefined}>
                {summary.percentUsed}% of your budget
              </span>
            </article>
            <article>
              <small>REMAINING</small>
              <strong className={summary.remaining < 0 ? "danger" : "success"}>{money(summary.remaining)}</strong>
              <span>
                {summary.remaining < 0
                  ? "Over budget"
                  : summary.daysLeft === 0
                    ? "Trip completed"
                    : `About ${money(summary.perDayRemaining, 0)} per day`}
              </span>
            </article>
          </div>

          <div className="container expense-layout">
            <section className="spending-card">
              <div className="title-row">
                <div>
                  <h2>Spending overview</h2>
                  <p>By category</p>
                </div>
                <button
                  onClick={() =>
                    setTripModal({
                      trip,
                      initial: {
                        name: trip.name,
                        destinationId: trip.destinationId ? String(trip.destinationId) : "",
                        startDate: trip.startDate,
                        endDate: trip.endDate,
                        budget: String(trip.budget),
                        currency: trip.currency,
                      },
                    })
                  }
                >
                  <Edit3 size={15} /> Edit trip
                </button>
              </div>
              <div className="chart-area">
                <div className="donut" style={{ background: donutGradient(summary.byCategory) }} role="img" aria-label="Spending by category">
                  <span>
                    <strong>{money(summary.totalSpent, 0)}</strong>
                    <small>Total spent</small>
                  </span>
                </div>
                <div className="legend">
                  {summary.byCategory.length === 0 && <p>No spending yet</p>}
                  {summary.byCategory.map(({ category, percent }) => (
                    <div key={category}>
                      <span className="legend-dot" style={{ background: CATEGORY_COLORS[category] }} />
                      {category}
                      <strong>{Math.round(percent)}%</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="budget-progress">
                <div>
                  <span>Budget used</span>
                  <strong>
                    {money(summary.totalSpent)} / {money(summary.budget, 0)}
                  </strong>
                </div>
                <div className="progress" role="progressbar" aria-valuenow={summary.percentUsed} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${Math.min(100, summary.percentUsed)}%`, background: STATUS_COLORS[summary.status] }} />
                </div>
                <p style={{ color: STATUS_COLORS[summary.status] }}>{budgetMessage(summary, (n) => money(n))}</p>
              </div>
            </section>

            <section className="recent-card">
              <div className="title-row">
                <div>
                  <h2>Recent expenses</h2>
                  <p>{plural(summary.expenseCount, "expense")} recorded</p>
                </div>
                <label className="select-pill">
                  <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by category">
                    <option value="">All categories</option>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </label>
              </div>
              {expenses.length === 0 && (
                <p className="expense-list-empty">{filter ? `No ${filter.toLowerCase()} expenses yet.` : "No expenses yet. Add your first one!"}</p>
              )}
              {expenses.map((expense) => {
                const Icon = EXPENSE_ICONS[expense.category]
                return (
                  <article className="expense-row" key={expense.id} onClick={() => setExpenseModal({ expense })}>
                    <span style={{ color: CATEGORY_COLORS[expense.category] }}>
                      <Icon />
                    </span>
                    <div>
                      <strong>{expense.title}</strong>
                      <small>
                        {expense.category} · {formatDate(expense.spentOn, { month: "short", day: "numeric" })}
                      </small>
                    </div>
                    <b>{money(expense.amount)}</b>
                    <button aria-label={`Edit ${expense.title}`} onClick={(event) => { event.stopPropagation(); setExpenseModal({ expense }) }}>
                      <Edit3 size={16} />
                    </button>
                    <button
                      aria-label={`Delete ${expense.title}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        deleteExpense(expense)
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                )
              })}
            </section>
          </div>
        </>
      )}

      {tripModalView}
      {expenseModal && (
        <ExpenseModal
          tripId={trip.id}
          currency={trip.currency}
          expense={expenseModal.expense}
          close={() => setExpenseModal(null)}
          saved={() => {
            setExpenseModal(null)
            detail.reload()
          }}
        />
      )}
    </main>
  )
}
