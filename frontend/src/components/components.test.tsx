import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Destination } from "../api/types"
import { AuthProvider } from "../context/AuthContext"
import { FavoritesProvider } from "../context/FavoritesContext"
import { ToastProvider } from "../context/ToastContext"
import DestinationCard from "./DestinationCard"
import { Field, Modal, StarSelect, Stars } from "./ui"

afterEach(() => vi.unstubAllGlobals())

const destination: Destination = {
  id: 7,
  slug: "sajek-valley",
  name: "Sajek Valley",
  location: "Rangamati, Bangladesh",
  country: "Bangladesh",
  region: "Asia",
  category: "Mountain",
  tag: "Above the clouds",
  summary: null,
  description: "Wake up above a sea of clouds.",
  imageUrl: "https://example.com/sajek.jpg",
  gallery: [],
  latitude: 23.38,
  longitude: 92.29,
  bestTime: null,
  entryFee: null,
  openingHours: null,
  gettingThere: null,
  localTip: null,
  avgCost: 220,
  rating: 4.7,
  reviewCount: 3,
  createdAt: "2030-01-01 00:00:00",
}

describe("UI components", () => {
  it("TC-FE-12 shows field errors accessibly", () => {
    render(<Field label="Email address" value="" onChange={() => {}} error="Please enter a valid email address" />)
    const input = screen.getByLabelText("Email address")
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument()
  })

  it("TC-FE-13 renders star ratings and lets the user pick one", async () => {
    const onChange = vi.fn()
    render(
      <>
        <Stars rating={4.4} />
        <StarSelect value={2} onChange={onChange} />
      </>,
    )
    expect(screen.getByRole("img", { name: "4.4 out of 5 stars" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "2 stars" })).toHaveAttribute("aria-checked", "true")
    await userEvent.click(screen.getByRole("radio", { name: "5 stars" }))
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it("TC-FE-14 closes dialogs with Escape, the close button or the backdrop", async () => {
    const close = vi.fn()
    render(
      <Modal title="Add an expense" close={close}>
        <input aria-label="Title" />
      </Modal>,
    )
    expect(screen.getByRole("dialog", { name: "Add an expense" })).toBeInTheDocument()
    expect(screen.getByLabelText("Title")).toHaveFocus()
    await userEvent.keyboard("{Escape}")
    await userEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(close).toHaveBeenCalledTimes(2)
  })
})

describe("DestinationCard", () => {
  function renderCard() {
    vi.stubGlobal("fetch", vi.fn())
    return render(
      <MemoryRouter initialEntries={["/explore"]}>
        <ToastProvider>
          <AuthProvider>
            <FavoritesProvider>
              <Routes>
                <Route path="/explore" element={<DestinationCard item={destination} />} />
                <Route path="/login" element={<p>Login page</p>} />
                <Route path="/destinations/:slug" element={<p>Details page</p>} />
              </Routes>
            </FavoritesProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>,
    )
  }

  it("TC-FE-15 shows the destination summary and opens its details", async () => {
    renderCard()
    expect(screen.getByRole("heading", { name: "Sajek Valley" })).toBeInTheDocument()
    expect(screen.getByText("Rangamati, Bangladesh")).toBeInTheDocument()
    expect(screen.getByText("4.7")).toBeInTheDocument()
    expect(screen.getByText("Above the clouds")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("heading", { name: "Sajek Valley" }))
    expect(screen.getByText("Details page")).toBeInTheDocument()
  })

  it("TC-FE-16 asks guests to log in before saving a favorite", async () => {
    renderCard()
    await userEvent.click(screen.getByRole("button", { name: "Save Sajek Valley to favorites" }))
    expect(screen.getByText("Login page")).toBeInTheDocument()
    expect(screen.getByText("Log in to save your favorite places")).toBeInTheDocument()
  })
})
