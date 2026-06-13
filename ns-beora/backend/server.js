require("dotenv").config({ path: ".env.local" })

const express = require("express")
const cors    = require("cors")

const chat    = require("./routes/chat")
const profile = require("./routes/profile")
const log     = require("./routes/log")
const stats   = require("./routes/stats")
const rewards = require("./routes/rewards")
const { requireAuth } = require("./middleware/auth")

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: false
}))
app.use(express.json({ limit: "256kb" }))

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "ns-beora-api" }))

// All routes require Firebase auth
app.get ("/api/profile",             requireAuth, profile.getProfile)
app.post("/api/profile",             requireAuth, profile.postProfile)

app.post("/api/chat",                requireAuth, chat.handle)

app.post("/api/log",                 requireAuth, log.handle)

app.get ("/api/stats",               requireAuth, stats.handle)

app.get ("/api/rewards",             requireAuth, rewards.list)
app.post("/api/rewards",             requireAuth, rewards.create)
app.delete("/api/rewards/:id",       requireAuth, rewards.remove)
app.post("/api/rewards/:id/redeem",  requireAuth, rewards.redeem)

app.use((err, _req, res, _next) => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), err: err.message, stack: err.stack }))
  res.status(500).json({ error: "Internal server error" })
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(JSON.stringify({ ts: new Date().toISOString(), msg: `ns-beora-api listening on ${PORT}` }))
})
