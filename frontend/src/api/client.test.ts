import { afterEach, describe, expect, it, vi } from "vitest"
import { api, ApiError, request, setToken } from "./client"

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

/** Awaits a request that is expected to fail and returns its error. */
async function failure(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error as ApiError
  }
  throw new Error("Expected the request to fail")
}

afterEach(() => {
  vi.unstubAllGlobals()
  setToken(null)
})

describe("API client", () => {
  it("TC-FE-08 builds query strings and skips empty values", async () => {
    const fetchMock = mockFetch(200, { items: [], total: 0 })
    await api.destinations.list({ q: "beach", category: ["Beach", "Nature"], region: [], minRating: undefined, page: 2 })
    expect(fetchMock.mock.calls[0][0]).toBe("/api/destinations?q=beach&category=Beach%2CNature&page=2")
  })

  it("TC-FE-09 sends the saved token and a JSON body", async () => {
    const fetchMock = mockFetch(201, { review: { id: 1 } })
    setToken("abc.def.ghi")
    await api.reviews.create({ destinationId: 3, rating: 5, comment: "Wonderful sunsets!" })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe("POST")
    expect(init.headers.Authorization).toBe("Bearer abc.def.ghi")
    expect(JSON.parse(init.body)).toEqual({ destinationId: 3, rating: 5, comment: "Wonderful sunsets!" })
  })

  it("TC-FE-10 turns API errors into ApiError with field details", async () => {
    mockFetch(400, { error: { message: "Please check the highlighted fields", details: { email: "Email is required" } } })
    const error = await failure(request("/auth/login", { method: "POST", body: {} }))
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.details).toEqual({ email: "Email is required" })
  })

  it("TC-FE-11 reports when the server cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))
    const error = await failure(api.destinations.get("sajek-valley"))
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.message).toMatch(/Cannot reach the Tripza server/)
  })
})
