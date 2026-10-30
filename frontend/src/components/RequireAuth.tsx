import type { ReactNode } from "react"
import { Lock } from "lucide-react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { EmptyState, Loading } from "./ui"

/** Sends guests to the login page (and back afterwards); optionally requires the admin role. */
export default function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (admin && user.role !== "admin") {
    return (
      <main className="page container">
        <EmptyState icon={<Lock />} title="Admins only" text="You need an administrator account to open this page." />
      </main>
    )
  }
  return <>{children}</>
}
