const { verifyIdToken } = require("../lib/firebase")

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ""
  const m = header.match(/^Bearer\s+(.+)$/i)
  if (!m) return res.status(401).json({ error: "Missing token" })

  try {
    const decoded = await verifyIdToken(m[1])
    req.user = { uid: decoded.uid, email: decoded.email, name: decoded.name }
    next()
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" })
  }
}

module.exports = { requireAuth }
