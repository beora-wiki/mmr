const TOKEN_KEY = "beora_token"
const USER_KEY  = "beora_user"

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAuthed() {
  return !!getToken()
}

export function isSuperAdmin() {
  const u = getUser()
  return !!(u && u.superadmin === true)
}

const POST_LOGIN_KEY = "beora_post_login"

export function setPostLoginPath(path) {
  if (path) sessionStorage.setItem(POST_LOGIN_KEY, path)
}

export function takePostLoginPath() {
  const p = sessionStorage.getItem(POST_LOGIN_KEY)
  if (p) sessionStorage.removeItem(POST_LOGIN_KEY)
  return p
}

const API_BASE = import.meta.env.VITE_API_URL || ""

export async function apiFetch(path, opts = {}) {
  const token = getToken()
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
  if (res.status === 401) {
    clearSession()
    window.location.href = "/login"
    throw new Error("unauthorized")
  }
  return res
}

const ADMIN_KEY = "beora_admin_token"

export function getAdminToken() {
  return sessionStorage.getItem(ADMIN_KEY)
}

export function setAdminToken(token) {
  sessionStorage.setItem(ADMIN_KEY, token)
}

export function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_KEY)
}

// Sends both the user JWT (Authorization Bearer) and the admin token
// (X-Admin-Token) when each is present. Backend accepts either path.
export async function adminFetch(path, opts = {}) {
  const adminToken = getAdminToken()
  const userToken  = getToken()
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
    ...(userToken  ? { Authorization: `Bearer ${userToken}` } : {}),
    ...(adminToken ? { "X-Admin-Token": adminToken } : {})
  }
  return fetch(`${API_BASE}${path}`, { ...opts, headers })
}
