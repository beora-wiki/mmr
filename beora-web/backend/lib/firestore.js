const { Firestore } = require("@google-cloud/firestore")

let _db = null

function db() {
  if (!_db) {
    _db = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "beora-492609"
    })
  }
  return _db
}

const USERS = "beora_web_users"

function emailToId(email) {
  return email.trim().toLowerCase()
}

async function getUser(email) {
  const id = emailToId(email)
  const doc = await db().collection(USERS).doc(id).get()
  return doc.exists ? { ...doc.data(), email: id } : null
}

async function listUsers() {
  const snap = await db().collection(USERS).get()
  return snap.docs.map(d => ({ ...d.data(), email: d.id }))
}

async function addUser({ name, email }) {
  const id = emailToId(email)
  await db().collection(USERS).doc(id).set({
    name:    name.trim(),
    email:   id,
    active:  true,
    addedAt: new Date().toISOString()
  })
  return { name: name.trim(), email: id, active: true }
}

async function updateUser(email, patch) {
  const id = emailToId(email)
  const ref = db().collection(USERS).doc(id)
  await ref.set(patch, { merge: true })
  const doc = await ref.get()
  return doc.exists ? { ...doc.data(), email: id } : null
}

async function deleteUser(email) {
  const id = emailToId(email)
  await db().collection(USERS).doc(id).delete()
}

async function seedSuperAdmins(emails, nameFor = e => e) {
  const results = []
  for (const email of emails) {
    const id  = emailToId(email)
    const ref = db().collection(USERS).doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      await ref.set({
        name:       nameFor(id),
        email:      id,
        active:     true,
        superadmin: true,
        addedAt:    new Date().toISOString()
      })
      results.push({ email: id, action: "created" })
    } else {
      const data = snap.data() || {}
      const patch = {}
      if (data.active !== true)     patch.active     = true
      if (data.superadmin !== true) patch.superadmin = true
      if (Object.keys(patch).length > 0) {
        await ref.set(patch, { merge: true })
        results.push({ email: id, action: "promoted" })
      } else {
        results.push({ email: id, action: "ok" })
      }
    }
  }
  return results
}

module.exports = {
  getUser,
  listUsers,
  addUser,
  updateUser,
  deleteUser,
  seedSuperAdmins,
  emailToId
}
