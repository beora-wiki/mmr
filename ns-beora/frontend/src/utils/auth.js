import { auth } from "./firebase"

const API_BASE = import.meta.env.VITE_API_URL || ""

// Always calls getIdToken() per request — tokens expire ~1h so we never store a static copy.
export async function apiFetch(path, opts = {}) {
  const user = auth.currentUser
  let headers = { "Content-Type": "application/json", ...(opts.headers || {}) }

  if (user) {
    try {
      const token = await user.getIdToken()
      headers["Authorization"] = `Bearer ${token}`
    } catch {
      // token refresh failed — caller will handle 401
    }
  }

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })

  if (res.status === 401) {
    window.location.href = "/login"
    throw new Error("unauthorized")
  }

  return res
}
