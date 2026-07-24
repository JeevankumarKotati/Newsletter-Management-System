// Main server file - Entry point for the Newsletter Management System
// Migrated to MongoDB with Mongoose

const express = require("express")
const mongoose = require("mongoose")
const session = require("express-session")
const path = require("path")
const { initializeDatabase } = require("./scripts/03-initialize-database")
const { setMemoryMode, seedDefaultData, isMemoryMode } = require("./models/memoryStore")

const app = express()
const PORT = process.env.PORT || 3000

function startListening(port) {
  const server = app.listen(port, () => {
    console.log(`\n🚀 Newsletter Management System running on port ${port}`)
    console.log(`📱 Visit http://localhost:${port} to access the application`)
    console.log(`🧠 Storage mode: ${isMemoryMode() ? "in-memory demo mode" : "MongoDB"}`)
    console.log(`\n👥 Demo accounts (password: 'password' for all):`)
    console.log(`   🔑 Admin: admin@newsletter.com`)
    console.log(`   ✏️  Editor: john.editor@newsletter.com`)
    console.log(`   👤 Subscriber: mike@email.com`)
    console.log(`\n🎯 Features available:`)
    console.log(`   • User registration and authentication`)
    console.log(`   • Role-based access control`)
    console.log(`   • Article and issue management`)
    console.log(`   • Feedback and rating system`)
    console.log(`   • Admin dashboard and user management`)
  })

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const nextPort = port + 1
      console.warn(`⚠️ Port ${port} is busy. Retrying on ${nextPort}...`)
      startListening(nextPort)
    } else {
      console.error("❌ Failed to start server:", error)
      process.exit(1)
    }
  })
}

// Initialize database and start server
async function startServer() {
  try {
    console.log("🔄 Starting Newsletter Management System...")

    // Try to connect to MongoDB, but fall back to in-memory storage if unavailable.
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/newsletter_system"
    try {
      await mongoose.connect(mongoUri)
      console.log("✅ Connected to MongoDB")
      await initializeDatabase()
    } catch (dbError) {
      console.warn("⚠️ MongoDB unavailable, switching to in-memory demo mode:", dbError.message)
      setMemoryMode(true)
      await seedDefaultData()
    }

    // Middleware setup
    app.use(express.json({ limit: "10mb" }))
    app.use(express.urlencoded({ extended: true, limit: "10mb" }))
    app.use(express.static("public"))

    // Session configuration
    app.use(
      session({
        secret: process.env.SESSION_SECRET || "newsletter-secret-key-change-in-production",
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: false,
          maxAge: 24 * 60 * 60 * 1000,
          httpOnly: true,
        },
      }),
    )

    // Make db reference available to routes (for model constructor compatibility)
    app.use((req, res, next) => {
      req.db = isMemoryMode() ? { mode: "memory" } : mongoose.connection
      next()
    })

    // Import route handlers
    const authRoutes = require("./routes/auth")
    const adminRoutes = require("./routes/admin")
    const editorRoutes = require("./routes/editor")
    const subscriberRoutes = require("./routes/subscriber")
    const publicRoutes = require("./routes/public")

    // Route middleware
    app.use("/auth", authRoutes)
    app.use("/admin", adminRoutes)
    app.use("/editor", editorRoutes)
    app.use("/subscriber", subscriberRoutes)
    app.use("/", publicRoutes)

    // Global error handling middleware
    app.use((err, req, res, next) => {
      console.error("❌ Server Error:", err.stack)
      const isDevelopment = process.env.NODE_ENV !== "production"
      res.status(500).json({
        error: "Internal server error",
        message: isDevelopment ? err.message : "Something went wrong",
        ...(isDevelopment && { stack: err.stack }),
      })
    })

    // Handle 404 errors
    app.use((req, res) => {
      res.status(404).json({ error: "Route not found" })
    })

    // Start server
    startListening(PORT)
  } catch (error) {
    console.error("❌ Failed to start server:", error)
    console.error("💡 Make sure MongoDB is running and accessible")
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🔄 Shutting down server...")
  mongoose.connection.close().then(() => {
    console.log("✅ MongoDB connection closed")
    process.exit(0)
  })
})

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error)
  process.exit(1)
})

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason)
  process.exit(1)
})

// Start the server
startServer()

module.exports = app
