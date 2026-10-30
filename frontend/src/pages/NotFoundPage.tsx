import { Compass } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button, EmptyState } from "../components/ui"

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <main className="page container">
      <EmptyState
        icon={<Compass />}
        title="Page not found"
        text="The page you’re looking for doesn’t exist or has moved. Let’s get you back on track."
        action={<Button onClick={() => navigate("/")}>Go home</Button>}
      />
    </main>
  )
}
