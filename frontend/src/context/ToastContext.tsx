import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

type ToastType = "success" | "error" | "info"
interface Toast {
  id: number
  message: string
  type: ToastType
}

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId.current++
    setToasts((current) => [...current.slice(-2), { id, message, type }])
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3800)
  }, [])

  const icons = useMemo(() => ({ success: CheckCircle2, error: AlertCircle, info: Info }), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = icons[toast.type]
          return (
            <div key={toast.id} className={`toast ${toast.type}`}>
              <Icon size={18} />
              {toast.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
