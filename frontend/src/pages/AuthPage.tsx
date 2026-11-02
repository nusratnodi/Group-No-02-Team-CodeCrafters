import { useState, type FormEvent } from "react"
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck, UserRound } from "lucide-react"
import { Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { ApiError } from "../api/client"
import { Logo } from "../components/Layout"
import { Button, Field } from "../components/ui"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"

const AUTH_IMAGE = "https://images.unsplash.com/photo-1592396355679-1e2a094e8bf1?auto=format&fit=crop&w=1400&q=85"
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const DEMO_LOGINS = {
  traveler: { email: "demo@tripza.com", password: "Demo@1234" },
  admin: { email: "admin@tripza.com", password: "Admin@1234" },
}

type Errors = Partial<Record<"name" | "email" | "password", string>>

/** Client-side checks that mirror the API's rules, so most mistakes are caught before submitting. */
export function validateAuthForm(mode: "login" | "register", values: { name: string; email: string; password: string }): Errors {
  const errors: Errors = {}
  if (mode === "register" && values.name.trim().length < 2) errors.name = "Please enter your name (at least 2 characters)"
  if (!EMAIL.test(values.email.trim())) errors.email = "Please enter a valid email address"
  if (!values.password) errors.password = "Please enter your password"
  else if (mode === "register" && values.password.length < 8) errors.password = "Use at least 8 characters"
  else if (mode === "register" && !/(?=.*[A-Za-z])(?=.*\d)/.test(values.password)) {
    errors.password = "Include at least one letter and one number"
  }
  return errors
}

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get("next") || "/explore"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={next} replace />
  const isLogin = mode === "login"

  function switchMode() {
    setErrors({})
    setFormError("")
    navigate(`${isLogin ? "/register" : "/login"}${params.toString() ? `?${params}` : ""}`)
  }

  function fillDemo(account: keyof typeof DEMO_LOGINS) {
    setEmail(DEMO_LOGINS[account].email)
    setPassword(DEMO_LOGINS[account].password)
    setErrors({})
    setFormError("")
    if (!isLogin) navigate(`/login${params.toString() ? `?${params}` : ""}`)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found = validateAuthForm(mode, { name, email, password })
    setErrors(found)
    setFormError("")
    if (Object.keys(found).length) return

    setSubmitting(true)
    try {
      const signedIn = isLogin ? await login(email.trim(), password) : await register(name.trim(), email.trim(), password)
      toast(isLogin ? `Welcome back, ${signedIn.name.split(" ")[0]}!` : `Welcome to Tripza, ${signedIn.name.split(" ")[0]}!`)
      navigate(next, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.details) setErrors(error.details as Errors)
      setFormError((error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <img src={AUTH_IMAGE} alt="Colorful houses along the Italian coast" />
        <div className="auth-overlay">
          <Logo />
          <div>
            <span className="hero-pill">Plan less. Experience more.</span>
            <h1>Your whole world of travel, in one place.</h1>
            <p>Join travelers finding unforgettable places, planning routes and keeping budgets on track with Tripza.</p>
          </div>
        </div>
      </section>
      <section className="auth-form">
        <button className="back" onClick={() => navigate("/")}>
          <ArrowLeft size={18} /> Back home
        </button>
        <div>
          <span className="eyebrow">{isLogin ? "Welcome back" : "Start your journey"}</span>
          <h1>{isLogin ? "Log in to Tripza" : "Create your account"}</h1>
          <p>{isLogin ? "Your saved trips are waiting." : "Free forever. No credit card needed."}</p>
          <div className="social-row">
            <Button variant="outline" icon={<UserRound size={17} />} onClick={() => fillDemo("traveler")}>
              Demo traveler
            </Button>
            <Button variant="outline" icon={<ShieldCheck size={17} />} onClick={() => fillDemo("admin")}>
              Demo admin
            </Button>
          </div>
          <div className="divider">
            <span>or continue with email</span>
          </div>
          <form onSubmit={submit} noValidate>
            {formError && (
              <div className="form-error" role="alert">
                {formError}
              </div>
            )}
            {!isLogin && (
              <Field label="Full name" placeholder="Your name" value={name} onChange={setName} error={errors.name} autoComplete="name" />
            )}
            <Field
              label="Email address"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={setEmail}
              error={errors.email}
              autoComplete="email"
            />
            <Field
              label="Password"
              placeholder={isLogin ? "Your password" : "At least 8 characters"}
              type={show ? "text" : "password"}
              value={password}
              onChange={setPassword}
              error={errors.password}
              autoComplete={isLogin ? "current-password" : "new-password"}
              trailing={
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <Button className="wide" type="submit" disabled={submitting}>
              {submitting ? "Please wait…" : isLogin ? "Log in" : "Create account"} <ArrowRight size={17} />
            </Button>
          </form>
          <p className="auth-switch">
            {isLogin ? "New to Tripza?" : "Already have an account?"}{" "}
            <button onClick={switchMode}>{isLogin ? "Create an account" : "Log in"}</button>
          </p>
        </div>
      </section>
    </main>
  )
}
