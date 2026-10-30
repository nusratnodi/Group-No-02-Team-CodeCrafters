import { lazy, Suspense, useEffect } from "react"
import { Route, Routes, useLocation } from "react-router-dom"
import { BottomNav, Navbar } from "./components/Layout"
import RequireAuth from "./components/RequireAuth"
import { Loading } from "./components/ui"
import HomePage from "./pages/HomePage"

// Pages are loaded on demand to keep the first download small (maps are only fetched when needed).
const AuthPage = lazy(() => import("./pages/AuthPage"))
const ExplorePage = lazy(() => import("./pages/ExplorePage"))
const DestinationPage = lazy(() => import("./pages/DestinationPage"))
const RoutePage = lazy(() => import("./pages/RoutePage"))
const NearbyPage = lazy(() => import("./pages/NearbyPage"))
const WeatherPage = lazy(() => import("./pages/WeatherPage"))
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"))
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"))
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
const AdminPage = lazy(() => import("./pages/AdminPage"))
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"))

/** Full-screen pages from the design that hide the navigation bars. */
const STANDALONE = ["/login", "/register", "/route"]

export default function App() {
  const { pathname } = useLocation()
  const standalone = STANDALONE.includes(pathname)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="app">
      {!standalone && <Navbar />}
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/destinations/:slug" element={<DestinationPage />} />
          <Route path="/route" element={<RoutePage />} />
          <Route path="/nearby" element={<NearbyPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/expenses" element={<RequireAuth><ExpensesPage /></RequireAuth>} />
          <Route path="/favorites" element={<RequireAuth><FavoritesPage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth admin><AdminPage /></RequireAuth>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      {!standalone && <BottomNav />}
    </div>
  )
}
