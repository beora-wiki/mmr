// Hard-coded superadmins — always have access to the web app and the
// /admin dashboard, even before Firestore is seeded. Adding/removing
// here requires a redeploy. Anyone with the shared ADMIN_TOKEN env var
// can also reach /admin (separate path), but these accounts log in by
// email like any other client.

const HARDCODED = [
  "alexs@beora.ai",
  "mattm@beora.ai",
  "travisr@beora.ai"
]

function getSuperAdmins() {
  const fromEnv = String(process.env.SUPER_ADMINS || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set([...HARDCODED.map(s => s.toLowerCase()), ...fromEnv])]
}

function isSuperAdmin(email) {
  if (!email) return false
  return getSuperAdmins().includes(String(email).trim().toLowerCase())
}

function defaultNameFromEmail(email) {
  const local = String(email).split("@")[0] || ""
  if (!local) return email
  return local.charAt(0).toUpperCase() + local.slice(1)
}

module.exports = { getSuperAdmins, isSuperAdmin, defaultNameFromEmail }
