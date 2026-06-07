const jwt = require("jsonwebtoken")
const { getUser } = require("../lib/firestore")
const { isSuperAdmin } = require("../lib/superadmins")

const JWT_SECRET = process.env.JWT_SECRET
const TTL_HOURS  = 24

async function login(req, res) {
  if (!JWT_SECRET) {
    return res.status(500).json({ error: "Server misconfigured (no JWT_SECRET)" })
  }

  const { name, email } = req.body || {}
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required." })
  }

  const cleanEmail = String(email).trim().toLowerCase()
  const cleanName  = String(name).trim()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "That email doesn't look right." })
  }

  let user = null
  let firestoreOk = true
  try {
    user = await getUser(cleanEmail)
  } catch (err) {
    firestoreOk = false
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "firestore lookup failed", err: err.message }))
  }

  const hardcodedSuper = isSuperAdmin(cleanEmail)
  const fsActive       = user && user.active === true
  const fsSuper        = user && user.superadmin === true
  const allowed        = hardcodedSuper || fsActive

  if (!allowed) {
    if (!firestoreOk && !hardcodedSuper) {
      return res.status(503).json({ error: "User directory unavailable. Try again." })
    }
    return res.status(403).json({
      error: "This email isn't on the access list. Ask Red Door staff to add you."
    })
  }

  const superadmin = hardcodedSuper || fsSuper

  const token = jwt.sign(
    { email: cleanEmail, name: cleanName, superadmin },
    JWT_SECRET,
    { expiresIn: `${TTL_HOURS}h` }
  )

  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    cat: "login",
    email: cleanEmail,
    superadmin
  }))

  res.json({
    token,
    name:       cleanName,
    email:      cleanEmail,
    superadmin
  })
}

module.exports = { login }
