require("dotenv").config({ path: ".env.local" })

const express = require("express")
const cors    = require("cors")

const auth     = require("./routes/auth")
const chat     = require("./routes/chat")
const schedule = require("./routes/schedule")
const admin    = require("./routes/admin")
const { requireAuth } = require("./middleware/auth")
const { seedSuperAdmins } = require("./lib/firestore")
const { getSuperAdmins, defaultNameFromEmail } = require("./lib/superadmins")

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: false
}))
app.use(express.json({ limit: "256kb" }))

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "beora-web-api" }))

app.post("/api/login",   auth.login)

app.post("/api/chat",    requireAuth, chat.handle)
app.get("/api/schedule", requireAuth, schedule.handle)

app.get("/api/admin/users",            admin.list)
app.post("/api/admin/users",           admin.add)
app.patch("/api/admin/users/:email",   admin.update)
app.delete("/api/admin/users/:email",  admin.remove)

app.use((err, _req, res, _next) => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), err: err.message, stack: err.stack }))
  res.status(500).json({ error: "Internal server error" })
})

const PORT = process.env.PORT || 8080
app.listen(PORT, async () => {
  console.log(JSON.stringify({ ts: new Date().toISOString(), msg: `beora-web-api listening on ${PORT}` }))

  try {
    const results = await seedSuperAdmins(getSuperAdmins(), defaultNameFromEmail)
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      cat: "bootstrap",
      msg: "super admins seeded",
      results
    }))
  } catch (err) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      cat: "bootstrap",
      msg: "super admin seed failed (will retry on next boot)",
      err: err.message
    }))
  }
})
