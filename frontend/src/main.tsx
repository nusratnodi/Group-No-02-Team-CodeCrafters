import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import "leaflet/dist/leaflet.css"
import "./index.css"
import "./app.css"
import App from "./App"
import { AuthProvider } from "./context/AuthContext"
import { FavoritesProvider } from "./context/FavoritesContext"
import { ToastProvider } from "./context/ToastContext"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <FavoritesProvider>
            <App />
          </FavoritesProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
