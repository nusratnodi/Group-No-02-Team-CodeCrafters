import { useEffect, useId, useRef, type ReactNode } from "react"
import { AlertTriangle, ArrowLeft, ChevronDown, Star, X } from "lucide-react"

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "light" | "danger"

export function Button({
  children,
  variant = "primary",
  onClick,
  icon,
  className = "",
  type = "button",
  disabled,
  ariaLabel,
}: {
  children?: ReactNode
  variant?: ButtonVariant
  onClick?: () => void
  icon?: ReactNode
  className?: string
  type?: "button" | "submit"
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <button type={type} className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {icon}
      {children}
    </button>
  )
}

export function Field({
  label,
  placeholder,
  icon,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
  min,
  max,
  step,
  trailing,
  className = "",
  onFocus,
  onBlur,
}: {
  label?: string
  placeholder?: string
  icon?: ReactNode
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string
  autoComplete?: string
  min?: string | number
  max?: string | number
  step?: string | number
  trailing?: ReactNode
  className?: string
  onFocus?: () => void
  onBlur?: () => void
}) {
  const id = useId()
  return (
    <label className={`field-wrap ${className}`} htmlFor={id}>
      {label && (
        <span className="field-label" id={`${id}-label`}>
          {label}
        </span>
      )}
      <span className={error ? "field has-error" : "field"}>
        {icon}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-label={label ? undefined : placeholder}
          aria-invalid={Boolean(error)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {trailing}
      </span>
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  className = "",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  error?: string
  className?: string
}) {
  const id = useId()
  return (
    <label className={`field-wrap ${className}`} htmlFor={id}>
      <span className="field-label" id={`${id}-label`}>
        {label}
      </span>
      <span className={error ? "field has-error" : "field"}>
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-labelledby={`${id}-label`}
          aria-invalid={Boolean(error)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} />
      </span>
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  error,
  rows = 4,
  className = "",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  rows?: number
  className?: string
}) {
  const id = useId()
  return (
    <label className={`field-wrap ${className}`} htmlFor={id}>
      <span className="field-label" id={`${id}-label`}>
        {label}
      </span>
      <textarea
        id={id}
        aria-labelledby={`${id}-label`}
        className={error ? "has-error" : undefined}
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

export function SectionTitle({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return (
    <div className="section-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  )
}

export function PageHeader({
  title,
  text,
  back,
  backLabel = "Back",
  action,
}: {
  title: string
  text?: ReactNode
  back?: () => void
  backLabel?: string
  action?: ReactNode
}) {
  return (
    <div className="page-header container">
      <div>
        {back && (
          <button className="back" onClick={back}>
            <ArrowLeft size={18} /> {backLabel}
          </button>
        )}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  )
}

export function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string
  close: () => void
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })

  // Focus the first field once when the dialog opens; Escape closes it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && closeRef.current()
    document.addEventListener("keydown", onKey)
    ref.current?.querySelector<HTMLElement>("input, select, textarea, button:not(.icon-button)")?.focus()
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        ref={ref}
        className={wide ? "modal wide" : "modal"}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={close} aria-label="Close">
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

/** Read-only star rating (rounded to the nearest whole star). */
export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const filled = Math.round(rating)
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} fill="currentColor" className={n <= filled ? undefined : "off"} />
      ))}
    </span>
  )
}

export function StarSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="star-select">
      <span>Your rating</span>
      <div role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={n <= value ? undefined : "off"}
            onClick={() => onChange(n)}
          >
            <Star fill="currentColor" />
          </button>
        ))}
      </div>
    </div>
  )
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="loading" role="status" aria-label={label}>
      <span className="spinner" />
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  compact = false,
}: {
  icon: ReactNode
  title: string
  text?: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={compact ? "empty-state compact" : "empty-state"}>
      <span>{icon}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <EmptyState
      compact
      icon={<AlertTriangle />}
      title="Something went wrong"
      text={error.message}
      action={retry && <Button variant="outline" onClick={retry}>Try again</Button>}
    />
  )
}
