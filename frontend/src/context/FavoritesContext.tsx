import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { api } from "../api/client"
import type { FavoriteType } from "../api/types"
import { useAuth } from "./AuthContext"
import { useToast } from "./ToastContext"

interface FavoritesValue {
  isSaved: (type: FavoriteType, id: number) => boolean
  toggle: (type: FavoriteType, id: number, name?: string) => Promise<void>
  /** False until the signed-in user's saved items have loaded. */
  ready: boolean
}

const FavoritesContext = createContext<FavoritesValue | null>(null)
const key = (type: FavoriteType, id: number) => `${type}:${id}`

/** Keeps the IDs of the user's saved destinations and places so every heart icon stays in sync. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(false)
    if (!user) {
      setSaved(new Set())
      return
    }
    api.favorites
      .list()
      .then(({ destinations, places }) =>
        setSaved(
          new Set([
            ...destinations.map((d) => key("destination", d.id)),
            ...places.map((p) => key("place", Number(p.id))),
          ]),
        ),
      )
      .catch(() => setSaved(new Set()))
      .finally(() => setReady(true))
  }, [user])

  const isSaved = useCallback((type: FavoriteType, id: number) => saved.has(key(type, id)), [saved])

  const toggle = useCallback(
    async (type: FavoriteType, id: number, name?: string) => {
      if (!user) {
        toast("Log in to save your favorite places", "info")
        navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`)
        return
      }
      const wasSaved = saved.has(key(type, id))
      const update = (add: boolean) =>
        setSaved((current) => {
          const next = new Set(current)
          if (add) next.add(key(type, id))
          else next.delete(key(type, id))
          return next
        })

      update(!wasSaved)
      try {
        if (wasSaved) await api.favorites.remove(type, id)
        else await api.favorites.add(type, id)
        toast(wasSaved ? `Removed${name ? ` ${name}` : ""} from favorites` : `Saved${name ? ` ${name}` : ""} to favorites`)
      } catch (error) {
        update(wasSaved)
        toast((error as Error).message, "error")
      }
    },
    [user, saved, toast, navigate, location],
  )

  const value = useMemo(() => ({ isSaved, toggle, ready }), [isSaved, toggle, ready])
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const value = useContext(FavoritesContext)
  if (!value) throw new Error("useFavorites must be used inside <FavoritesProvider>")
  return value
}
