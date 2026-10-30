import { Router } from "express"
import { notFound } from "../utils/errors.js"
import { validate } from "../utils/validate.js"
import { favoriteSchema } from "./schemas.js"

export default function favoriteRoutes({ models, auth }) {
  const router = Router()
  router.use(auth.authenticate)

  router.get("/", async (req, res) => {
    res.json(await models.favorites.list(req.user.id))
  })

  router.post("/", async (req, res) => {
    const { itemType, itemId } = validate(req.body, favoriteSchema)
    const model = itemType === "destination" ? models.destinations : models.places
    if (!(await model.findById(itemId))) throw notFound(itemType === "destination" ? "Destination not found" : "Place not found")
    const created = await models.favorites.add(req.user.id, itemType, itemId)
    res.status(created ? 201 : 200).json({ itemType, itemId, saved: true })
  })

  router.delete("/:itemType/:itemId", async (req, res) => {
    const { itemType, itemId } = validate(req.params, favoriteSchema)
    if (!(await models.favorites.remove(req.user.id, itemType, itemId))) throw notFound("This item is not in your favorites")
    res.status(204).end()
  })

  return router
}
