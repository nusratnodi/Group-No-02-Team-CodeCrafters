import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { toPublicUser } from "../models/UserModel.js"
import { conflict, unauthorized } from "../utils/errors.js"

export class AuthService {
  constructor({ users, jwtSecret, jwtExpiresIn = "7d", bcryptRounds = 10 }) {
    this.users = users
    this.jwtSecret = jwtSecret
    this.jwtExpiresIn = jwtExpiresIn
    this.bcryptRounds = bcryptRounds
  }

  hashPassword(password) {
    return bcrypt.hash(password, this.bcryptRounds)
  }

  issueToken(user) {
    return jwt.sign({ sub: String(user.id), role: user.role }, this.jwtSecret, { expiresIn: this.jwtExpiresIn })
  }

  /** Returns the user a bearer token belongs to, or null if the token is invalid or expired. */
  async verifyToken(token) {
    let payload
    try {
      payload = jwt.verify(token, this.jwtSecret)
    } catch {
      return null
    }
    return (await this.users.findById(Number(payload.sub))) ?? null
  }

  async register({ name, email, password }) {
    if (await this.users.findByEmail(email)) {
      throw conflict("An account with this email already exists", { email: "Email is already registered" })
    }
    const user = await this.users.create({ name, email, passwordHash: await this.hashPassword(password) })
    return { token: this.issueToken(user), user: toPublicUser(user) }
  }

  async login({ email, password }) {
    const user = await this.users.findByEmail(email)
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false
    if (!valid) throw unauthorized("Invalid email or password")
    return { token: this.issueToken(user), user: toPublicUser(user) }
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.users.findById(userId)
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw unauthorized("Current password is incorrect")
    }
    await this.users.updatePassword(userId, await this.hashPassword(newPassword))
  }
}
