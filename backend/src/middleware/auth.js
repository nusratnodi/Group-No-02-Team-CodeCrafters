import { forbidden, unauthorized } from "../utils/errors.js"

function bearerToken(req) {
  const [scheme, token] = (req.get("authorization") || "").split(" ")
  return scheme === "Bearer" && token ? token : null
}

/** Builds the authentication middleware around the AuthService. */
export function createAuthMiddleware(authService) {
  /** Requires a valid token and attaches the user to `req.user`. */
  async function authenticate(req, res, next) {
    const token = bearerToken(req)
    const user = token ? await authService.verifyToken(token) : null
    if (!user) throw unauthorized(token ? "Your session has expired. Please log in again." : undefined)
    req.user = user
    next()
  }

  /** Attaches the user when a valid token is sent, but never rejects the request. */
  async function optionalAuth(req, res, next) {
    const token = bearerToken(req)
    req.user = token ? await authService.verifyToken(token) : null
    next()
  }

  /** Must run after `authenticate`. */
  function requireAdmin(req, res, next) {
    if (req.user?.role !== "admin") throw forbidden("Admin access required")
    next()
  }

  return { authenticate, optionalAuth, requireAdmin }
}
