export function apiNotFound(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } })
}

// Express recognises error handlers by their four arguments.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { message: "Request body is not valid JSON" } })
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: { message: "Request body is too large" } })
  }

  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500
  if (status >= 500) console.error(err)

  res.status(status).json({
    error: {
      message: status >= 500 ? "Something went wrong on our side. Please try again." : err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  })
}
