import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { setToken } from "../api/client"
import { AuthProvider } from "../context/AuthContext"
import { ToastProvider } from "../context/ToastContext"
import AuthPage, { validateAuthForm } from "./AuthPage"

afterEach(() => {
  vi.unstubAllGlobals()
  setToken(null)
})

function renderAuth(path = "/login") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/explore" element={<p>Explore page</p>} />
            <Route path="/expenses" element={<p>Expenses page</p>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe("Authentication form", () => {
  it("TC-FE-17 validates input before contacting the server", () => {
    expect(validateAuthForm("login", { name: "", email: "bad", password: "" })).toEqual({
      email: "Please enter a valid email address",
      password: "Please enter your password",
    })
    expect(validateAuthForm("register", { name: "A", email: "a@b.co", password: "password" })).toEqual({
      name: "Please enter your name (at least 2 characters)",
      password: "Include at least one letter and one number",
    })
    expect(validateAuthForm("register", { name: "Safin Islam", email: "safin@example.com", password: "Travel2026" })).toEqual({})
  })

  it("TC-FE-18 shows errors and does not submit an empty login form", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    renderAuth()
    await userEvent.click(screen.getByRole("button", { name: /^Log in/ }))
    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("TC-FE-19 logs in with the demo account and returns to the requested page", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          token: "jwt-token",
          user: { id: 2, name: "Alex Johnson", email: "demo@tripza.com", role: "user", location: null, bio: null, createdAt: "" },
        }),
    })
    vi.stubGlobal("fetch", fetchMock)
    renderAuth("/login?next=%2Fexpenses")

    await userEvent.click(screen.getByRole("button", { name: "Demo traveler" }))
    expect(screen.getByLabelText("Email address")).toHaveValue("demo@tripza.com")
    await userEvent.click(screen.getByRole("button", { name: /^Log in/ }))

    expect(await screen.findByText("Expenses page")).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/login")
    expect(screen.getByText("Welcome back, Alex!")).toBeInTheDocument()
  })

  it("TC-FE-20 shows the server's message when login fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({ error: { message: "Invalid email or password" } }) }),
    )
    renderAuth()
    await userEvent.type(screen.getByLabelText("Email address"), "demo@tripza.com")
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password1")
    await userEvent.click(screen.getByRole("button", { name: /^Log in/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password")
  })

  it("TC-FE-21 switches between log in and sign up", async () => {
    vi.stubGlobal("fetch", vi.fn())
    renderAuth()
    await userEvent.click(screen.getByRole("button", { name: "Create an account" }))
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument()
    expect(screen.getByLabelText("Full name")).toBeInTheDocument()
  })
})
