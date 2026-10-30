import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { api, getToken, setToken, setUnauthorizedHandler } from "../api/client"
import type { User } from "../api/types"

interface AuthValue {
  user: User | null
  /** True while the saved session is being checked on first load. */
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string) => Promise<User>
  logout: () => void
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(getToken()))

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!getToken()) return
    api.auth
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => logout())
      .finally(() => setLoading(false))
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login(email, password)
    setToken(result.token)
    setUser(result.user)
    return result.user
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await api.auth.register(name, email, password)
    setToken(result.token)
    setUser(result.user)
    return result.user
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>")
  return value
}
