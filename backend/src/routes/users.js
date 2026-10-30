import { Router } from "express"
import { toPublicUser } from "../models/UserModel.js"
import { validate } from "../utils/validate.js"
import { changePasswordSchema, profileSchema } from "./schemas.js"

export default function userRoutes({ models, services, auth }) {
  const router = Router()
  router.use(auth.authenticate)

  router.get("/me", async (req, res) => {
    res.json({ user: toPublicUser(req.user), stats: await models.users.stats(req.user.id) })
  })

  router.put("/me", async (req, res) => {
    const data = validate(req.body, profileSchema, { partial: true })
    const user = await models.users.update(req.user.id, data)
    res.json({ user: toPublicUser(user) })
  })

  router.put("/me/password", async (req, res) => {
    const { currentPassword, newPassword } = validate(req.body, changePasswordSchema)
    await services.auth.changePassword(req.user.id, currentPassword, newPassword)
    res.json({ message: "Password updated" })
  })

  return router
}
