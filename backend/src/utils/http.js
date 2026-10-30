import { config } from "../config.js"

/** Fetches JSON from an external API with a timeout. Throws on network errors or non-2xx responses. */
export async function fetchJson(url, { timeoutMs = 6000, method = "GET", headers = {}, body } = {}) {
  const response = await fetch(url, {
    method,
    body,
    headers: { "User-Agent": config.userAgent, Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) throw new Error(`Request to ${new URL(url).host} failed with ${response.status}`)
  return response.json()
}
