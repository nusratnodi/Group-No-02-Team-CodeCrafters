import { Router } from "express"
import { conflict, forbidden, notFound, unauthorized } from "../utils/errors.js"
import { parseId, validate } from "../utils/validate.js"
import { pagination } from "./helpers.js"
import { reviewSchema, reviewUpdateSchema } from "./schemas.js"

export default function reviewRoutes({ models, auth }) {
  const router = Router()

  /** The review with this id, if the current user wrote it (admins may also delete). */
  async function editableReview(req, { allowAdmin = false } = {}) {
    const review = await models.reviews.findById(parseId(req.params.id, "review id"))
    if (!review) throw notFound("Review not found")
    const isOwner = review.userId === req.user.id
    if (!isOwner && !(allowAdmin && req.user.role === "admin")) throw forbidden("You can only change your own reviews")
    return review
  }

  router.get("/", auth.optionalAuth, async (req, res) => {
    let destinationId
    if (req.query.destination) {
      const destination = await models.destinations.find(req.query.destination)
      if (!destination) throw notFound("Destination not found")
      destinationId = destination.id
    }
    let userId
    if (req.query.mine === "true" || req.query.mine === "1") {
      if (!req.user) throw unauthorized()
      userId = req.user.id
    }

    const { limit, page, offset } = pagination(req.query, { defaultLimit: 10 })
    const { items, total } = await models.reviews.list({ destinationId, userId, limit, offset })
    const summary = await models.reviews.summary({ destinationId, userId })
    res.json({ summary, items, total, page, limit })
  })

  router.post("/", auth.authenticate, async (req, res) => {
    const data = validate(req.body, reviewSchema)
    if (!(await models.destinations.findById(data.destinationId))) throw notFound("Destination not found")
    if (await models.reviews.findByUserAndDestination(req.user.id, data.destinationId)) {
      throw conflict("You have already reviewed this destination. Edit your existing review instead.")
    }
    const review = await models.reviews.create({ userId: req.user.id, ...data })
    res.status(201).json({ review })
  })

  router.put("/:id", auth.authenticate, async (req, res) => {
    const review = await editableReview(req)
    const data = validate(req.body, reviewUpdateSchema, { partial: true })
    res.json({ review: await models.reviews.update(review.id, data) })
  })

  router.delete("/:id", auth.authenticate, async (req, res) => {
    const review = await editableReview(req, { allowAdmin: true })
    await models.reviews.delete(review.id)
    res.status(204).end()
  })

  return router
}
