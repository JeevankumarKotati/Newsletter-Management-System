// User model - handles all user-related database operations (MongoDB/Mongoose)

const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const { getStore } = require("./memoryStore")

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true, minlength: 3, maxlength: 50 },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    full_name: { type: String, required: true, maxlength: 100 },
    role: { type: String, enum: ["admin", "editor", "subscriber"], default: "subscriber" },
    subscription_status: { type: String, enum: ["active", "expired", "cancelled"], default: "active" },
    subscription_end_date: { type: Date },
    account_status: { type: String, enum: ["active", "banned"], default: "active" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
)

userSchema.index({ role: 1 })
userSchema.index({ subscription_status: 1 })

const UserModel = mongoose.model("User", userSchema)

class User {
  constructor(db) {
    this.db = db
  }

  _isMemoryMode() {
    return this.db?.mode === "memory"
  }

  async create(userData) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      const subscriptionEndDate = new Date()
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1)

      const user = {
        id: `user_${store.counters.user++}`,
        username: userData.username,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        full_name: userData.full_name,
        role: userData.role || "subscriber",
        subscription_status: "active",
        subscription_end_date: subscriptionEndDate,
        account_status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      }

      store.users.push(user)
      return user.id
    }

    const { username, email, password, full_name, role = "subscriber" } = userData
    const hashedPassword = await bcrypt.hash(password, 10)
    const subscriptionEndDate = new Date()
    subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1)

    const user = await UserModel.create({
      username,
      email,
      password: hashedPassword,
      full_name,
      role,
      subscription_end_date: subscriptionEndDate,
    })
    console.log(`✅ User created with ID: ${user._id}`)
    return user._id
  }

  async findByEmail(email) {
    if (this._isMemoryMode()) {
      const normalizedEmail = email.toLowerCase().trim()
      const user = getStore().users.find((entry) => entry.email.toLowerCase() === normalizedEmail)
      return user ? { ...user } : null
    }

    const user = await UserModel.findOne({ email }).lean()
    if (user) { user.id = user._id }
    return user || null
  }

  async findByUsername(username) {
    if (this._isMemoryMode()) {
      const normalizedUsername = username.trim()
      const user = getStore().users.find((entry) => entry.username === normalizedUsername)
      return user ? { ...user } : null
    }

    const user = await UserModel.findOne({ username }).lean()
    if (user) { user.id = user._id }
    return user || null
  }

  async findById(id) {
    if (this._isMemoryMode()) {
      const user = getStore().users.find((entry) => entry.id === id || entry.id?.toString() === id?.toString())
      return user ? { ...user } : null
    }

    const user = await UserModel.findById(id).lean()
    if (user) { user.id = user._id }
    return user || null
  }

  async getAll(limit = 100, offset = 0) {
    if (this._isMemoryMode()) {
      const users = getStore().users
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(offset, offset + limit)
      return users.map(({ password, ...user }) => ({ ...user }))
    }

    const users = await UserModel.find({}, "-password")
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
    return users.map((u) => ({ ...u, id: u._id }))
  }

  async update(id, userData) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const index = store.users.findIndex((entry) => entry.id === id || entry.id?.toString() === id?.toString())
      if (index === -1) return false
      store.users[index] = { ...store.users[index], ...userData, updated_at: new Date() }
      return true
    }

    const { username, email, full_name, role, subscription_status, account_status } = userData
    const result = await UserModel.findByIdAndUpdate(
      id,
      { username, email, full_name, role, subscription_status, account_status },
      { new: true }
    )
    if (result) console.log(`✅ User updated: ID ${id}`)
    return !!result
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword)
  }

  async updateSubscription(userId, status, endDate) {
    if (this._isMemoryMode()) {
      const store = getStore()
      const index = store.users.findIndex((entry) => entry.id === userId || entry.id?.toString() === userId?.toString())
      if (index === -1) return false
      store.users[index] = { ...store.users[index], subscription_status: status, subscription_end_date: endDate, updated_at: new Date() }
      return true
    }

    const result = await UserModel.findByIdAndUpdate(userId, {
      subscription_status: status,
      subscription_end_date: endDate,
    })
    if (result) console.log(`✅ Subscription updated for user ID: ${userId}`)
    return !!result
  }
}

module.exports = User
module.exports.UserModel = UserModel
