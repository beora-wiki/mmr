const { requireAdmin } = require("../middleware/auth")
const {
  listUsers,
  addUser,
  updateUser,
  deleteUser
} = require("../lib/firestore")
const { isSuperAdmin } = require("../lib/superadmins")

function gate(handler) {
  return (req, res, next) => requireAdmin(req, res, () => handler(req, res, next))
}

const list = gate(async (_req, res) => {
  try {
    const users = await listUsers()
    users.sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""))
    res.json({ users })
  } catch (err) {
    console.error(JSON.stringify({ msg: "admin list failed", err: err.message }))
    res.status(503).json({ error: "Couldn't load users." })
  }
})

const add = gate(async (req, res) => {
  const { name, email } = req.body || {}
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required." })
  }
  const cleanEmail = String(email).trim().toLowerCase()
  const cleanName  = String(name).trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "Email format is invalid." })
  }
  try {
    const user = await addUser({ name: cleanName, email: cleanEmail })
    res.json({ user })
  } catch (err) {
    console.error(JSON.stringify({ msg: "admin add failed", err: err.message }))
    res.status(503).json({ error: "Couldn't add user." })
  }
})

const update = gate(async (req, res) => {
  const email = req.params.email
  const patch = {}
  if (typeof req.body?.active === "boolean") patch.active = req.body.active
  if (typeof req.body?.name   === "string")  patch.name   = req.body.name.trim()

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: "Nothing to update." })
  }

  if (isSuperAdmin(email) && patch.active === false) {
    return res.status(403).json({ error: "Hardcoded superadmins can't be deactivated." })
  }

  try {
    const user = await updateUser(email, patch)
    if (!user) return res.status(404).json({ error: "User not found." })
    res.json({ user })
  } catch (err) {
    console.error(JSON.stringify({ msg: "admin update failed", err: err.message }))
    res.status(503).json({ error: "Couldn't update user." })
  }
})

const remove = gate(async (req, res) => {
  if (isSuperAdmin(req.params.email)) {
    return res.status(403).json({ error: "Hardcoded superadmins can't be removed." })
  }
  try {
    await deleteUser(req.params.email)
    res.json({ ok: true })
  } catch (err) {
    console.error(JSON.stringify({ msg: "admin delete failed", err: err.message }))
    res.status(503).json({ error: "Couldn't remove user." })
  }
})

module.exports = { list, add, update, remove }
