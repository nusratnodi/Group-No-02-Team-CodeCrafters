import { Router } from "express"
import { toPublicUser } from "../models/UserModel.js"
import { validate } from "../utils/validate.js"
import { loginSchema, registerSchema } from "./schemas.js"

export default function authRoutes({ services, auth }) {
  const router = Router()

  router.post("/register", async (req, res) => {
    const data = validate(req.body, registerSchema)
    res.status(201).json(await services.auth.register(data))
  })

  router.post("/login", async (req, res) => {
    const data = validate(req.body, loginSchema)
    res.json(await services.auth.login(data))
  })

  router.get("/me", auth.authenticate, (req, res) => {
    res.json({ user: toPublicUser(req.user) })
  })

  return router
}
