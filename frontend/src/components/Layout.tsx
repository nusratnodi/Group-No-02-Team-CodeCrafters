import { useEffect, useRef, useState, type FormEvent } from "react"
import {
  ArrowRight,
  ChevronDown,
  Compass,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  User,
  WalletCards,
  X,
} from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { api } from "../api/client"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { initials } from "../utils/format"
import { Button } from "./ui"

const navItems = [
  { to: "/explore", label: "Explore" },
  { to: "/nearby", label: "Nearby" },
  { to: "/weather", label: "Weather" },
  { to: "/expenses", label: "Expenses" },
  { to: "/favorites", label: "Favorites" },
]

export function Logo() {
  const navigate = useNavigate()
  return (
    <button className="logo" onClick={() => navigate("/")} aria-label="Tripza home">
      <span className="logo-mark">
        <Navigation size={19} fill="currentColor" />
      </span>
      <span>Tripza</span>
    </button>
  )
}

function AccountMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false)
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  if (!user) return null
  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <div className="account" ref={ref}>
      <button className="account-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu">
        <span className="avatar-sm">{initials(user.name)}</span>
        <span>{user.name.split(" ")[0]}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <div className="menu-head">
            <strong>{user.name}</strong>
            {user.email}
          </div>
          <button role="menuitem" onClick={() => go("/profile")}>
            <User size={17} /> My profile
          </button>
          <button role="menuitem" onClick={() => go("/expenses")}>
            <WalletCards size={17} /> Trip budgets
          </button>
          <button role="menuitem" onClick={() => go("/favorites")}>
            <Heart size={17} /> Favorites
          </button>
          {user.role === "admin" && (
            <button role="menuitem" onClick={() => go("/admin")}>
              <LayoutDashboard size={17} /> Admin dashboard
            </button>
          )}
          <hr />
          <button
            role="menuitem"
            onClick={() => {
              logout()
              setOpen(false)
              toast("You have been logged out", "info")
              navigate("/")
            }}
          >
            <LogOut size={17} /> Log out
          </button>
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <header className="navbar">
      <div className="nav-inner">
        <Logo />
        <nav className={open ? "nav-links open" : "nav-links"} aria-label="Main">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              {item.label}
            </NavLink>
          ))}
          {user ? (
            <NavLink to="/profile" className="nav-link mobile-only">
              My profile
            </NavLink>
          ) : (
            <NavLink to="/login" className="nav-link mobile-only">
              Log in / Sign up
            </NavLink>
          )}
        </nav>
        <div className="nav-actions">
          {user ? (
            <AccountMenu />
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/login")}>
                Log in
              </Button>
              <Button onClick={() => navigate("/register")}>Sign up</Button>
            </>
          )}
        </div>
        <button className="icon-button mobile-menu" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  )
}

export function BottomNav() {
  const tabs = [
    ["/", "Home", Home],
    ["/explore", "Explore", Compass],
    ["/nearby", "Nearby", MapPin],
    ["/expenses", "Expenses", WalletCards],
    ["/profile", "Profile", User],
  ] as const
  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      {tabs.map(([to, label, Icon]) => (
        <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
          <Icon size={21} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function Footer() {
  const navigate = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)

  async function subscribe(event: FormEvent) {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      toast("Please enter a valid email address", "error")
      return
    }
    setSending(true)
    try {
      const { message } = await api.newsletter.subscribe(email.trim())
      toast(message)
      setEmail("")
    } catch (error) {
      toast((error as Error).message, "error")
    } finally {
      setSending(false)
    }
  }

  const link = (path: string, label: string) => <button onClick={() => navigate(path)}>{label}</button>

  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <Logo />
          <p>Helping curious people explore the world with more confidence and less stress.</p>
        </div>
        <div>
          <strong>Discover</strong>
          {link("/explore", "Destinations")}
          {link("/nearby", "Nearby places")}
          {link("/weather", "Weather")}
        </div>
        <div>
          <strong>Plan</strong>
          {link("/expenses", "Trip budget")}
          {link("/favorites", "Favorites")}
          {link("/reviews", "Traveler reviews")}
        </div>
        <div>
          <strong>Stay inspired</strong>
          <p>Weekly travel ideas, no clutter.</p>
          <form className="newsletter" onSubmit={subscribe}>
            <input
              aria-label="Email address"
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button aria-label="Subscribe" type="submit" disabled={sending}>
              <ArrowRight size={17} />
            </button>
          </form>
        </div>
      </div>
      <div className="container copyright">
        © {new Date().getFullYear()} Tripza · Group No-02, Team CodeCrafters. Travel well, travel often.
        <span>CSE0613316 project</span>
      </div>
    </footer>
  )
}
