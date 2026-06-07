const jwt = require("jsonwebtoken")
const { isSuperAdmin } = require("../lib/superadmins")

const JWT_SECRET = process.env.JWT_SECRET

function requireAuth(req, res, next) {
  if (!JWT_SECRET) {
    return res.status(500).json({ error: "Server misconfigured (no JWT_SECRET)" })
  }
  const header = req.headers.authorization || ""
  const m = header.match(/^Bearer\s+(.+)$/i)
  if (!m) return res.status(401).json({ error: "Missing token" })

  try {
    const payload = jwt.verify(m[1], JWT_SECRET)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" })
  }
}

// Two valid paths to /api/admin/*:
//   1. Authorization: Bearer <jwt>  with superadmin: true claim
//      (or with email matching the hardcoded superadmin list)
//   2. X-Admin-Token: <ADMIN_TOKEN>  (legacy shared-token path)
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || ""
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (m && JWT_SECRET) {
    try {
      const payload = jwt.verify(m[1], JWT_SECRET)
      if (payload.superadmin === true || isSuperAdmin(payload.email)) {
        req.admin = { email: payload.email, via: "jwt" }
        return next()
      }
    } catch {
      /* fall through to token path */
    }
  }

  const expected = process.env.ADMIN_TOKEN
  if (expected) {
    const provided = req.headers["x-admin-token"]
    if (provided && provided === expected) {
      req.admin = { via: "token" }
      return next()
    }
  }

  return res.status(401).json({ error: "Admin access required" })
}

module.exports = { requireAuth, requireAdmin }
