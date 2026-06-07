import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  adminFetch,
  setAdminToken,
  getAdminToken,
  clearAdminToken,
  getUser,
  isSuperAdmin,
  clearSession,
  setPostLoginPath
} from "../utils/auth"

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function ToggleIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      {active
        ? <><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></>
        : <><circle cx="12" cy="12" r="9" /><line x1="9" y1="12" x2="15" y2="12" /></>
      }
    </svg>
  )
}

function AdminGate({ onAuth }) {
  const navigate = useNavigate()
  const [token, setToken]     = useState("")
  const [error, setError]     = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    setAdminToken(token.trim())
    const res = await adminFetch("/api/admin/users")
    if (res.ok) {
      onAuth()
    } else {
      clearAdminToken()
      setError("Invalid admin token.")
      setLoading(false)
    }
  }

  function goSignIn() {
    setPostLoginPath("/admin")
    navigate("/login")
  }

  return (
    <div className="admin-gate">
      <div className="login-brand">
        <div className="login-wordmark">beora</div>
        <div className="login-tagline">Staff · Admin</div>
      </div>

      <form className="login-form" onSubmit={submit}>
        <div className="login-field">
          <label className="login-label">Admin Token</label>
          <input
            className="login-input"
            type="password"
            autoComplete="off"
            placeholder="Enter staff admin token"
            value={token}
            onChange={e => setToken(e.target.value)}
          />
        </div>
        <button className="login-cta" type="submit" disabled={loading || !token.trim()}>
          {loading ? "Verifying…" : "Continue"}
        </button>
        {error && <div className="login-error">{error}</div>}
      </form>

      <div className="login-footer">
        <button
          type="button"
          onClick={goSignIn}
          style={{ color: "var(--coral)", textDecoration: "underline", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.06em" }}
        >
          Or sign in as superadmin →
        </button>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()
  const user        = getUser()
  const userIsSuper = isSuperAdmin()

  const [authed, setAuthed]   = useState(userIsSuper || !!getAdminToken())
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState("")
  const [name, setName]       = useState("")
  const [email, setEmail]     = useState("")
  const [adding, setAdding]   = useState(false)

  async function load() {
    setLoading(true)
    setError("")
    try {
      const res = await adminFetch("/api/admin/users")
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          clearAdminToken()
          setAuthed(false)
          return
        }
        setError(data.error || "Couldn't load users.")
      } else {
        setUsers(data.users || [])
      }
    } catch {
      setError("Couldn't reach the server.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authed) load()
  }, [authed])

  if (!authed) {
    return <AdminGate onAuth={() => setAuthed(true)} />
  }

  async function addUser(e) {
    e.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName  = name.trim()
    if (!trimmedName || !trimmedEmail) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("That email doesn't look right.")
      return
    }
    setAdding(true)
    setError("")
    try {
      const res = await adminFetch("/api/admin/users", {
        method: "POST",
        body:   JSON.stringify({ name: trimmedName, email: trimmedEmail })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Couldn't add user.")
      } else {
        setName("")
        setEmail("")
        load()
      }
    } catch {
      setError("Couldn't reach the server.")
    } finally {
      setAdding(false)
    }
  }

  async function toggleActive(u) {
    await adminFetch(`/api/admin/users/${encodeURIComponent(u.email)}`, {
      method: "PATCH",
      body:   JSON.stringify({ active: !u.active })
    })
    load()
  }

  async function removeUser(u) {
    if (!confirm(`Remove ${u.name} (${u.email})?`)) return
    await adminFetch(`/api/admin/users/${encodeURIComponent(u.email)}`, {
      method: "DELETE"
    })
    load()
  }

  function signOut() {
    clearAdminToken()
    if (userIsSuper) {
      clearSession()
      navigate("/login", { replace: true })
    } else {
      setAuthed(false)
    }
  }

  function goToApp() {
    navigate("/app")
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <div className="app-header-wordmark">beora</div>
          <div className="app-header-facility">
            {userIsSuper && user ? `Superadmin · ${user.name}` : "Staff Admin"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {userIsSuper && (
            <button className="app-header-signout" onClick={goToApp}>App</button>
          )}
          <button className="app-header-signout" onClick={signOut}>Sign Out</button>
        </div>
      </div>

      <div className="admin-section-label">Add User</div>
      <form className="admin-add-form" onSubmit={addUser}>
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={adding}
        />
        <input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={adding}
        />
        <button
          className="admin-add-btn"
          type="submit"
          disabled={adding || !name.trim() || !email.trim()}
        >
          {adding ? "Adding…" : "Add User"}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      <div className="admin-section-label">
        Users ({users.length})
      </div>

      {loading && (
        <div className="placeholder">
          <div className="spinner" />
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="placeholder">
          <p>No users yet. Add the first one above.</p>
        </div>
      )}

      {!loading && users.map(u => (
        <div className="admin-user-row" key={u.email}>
          <div className="admin-user-info">
            <div className="admin-user-name">
              {u.name}
              {u.superadmin && (
                <span style={{
                  marginLeft: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--iodine-700)",
                  background: "var(--iodine-50)",
                  border: "1px solid var(--iodine-500)",
                  borderRadius: "var(--radius-pill)",
                  padding: "2px 8px",
                  verticalAlign: "middle"
                }}>
                  Super
                </span>
              )}
            </div>
            <div className="admin-user-email">{u.email}</div>
          </div>

          <div className={"admin-user-status " + (u.active ? "active" : "blocked")}>
            {u.active ? "Active" : "Blocked"}
          </div>

          <div className="admin-user-actions">
            <button
              className="admin-icon-btn"
              onClick={() => toggleActive(u)}
              disabled={u.superadmin}
              aria-label={u.active ? "Block" : "Activate"}
              title={u.superadmin ? "Superadmins can't be blocked" : (u.active ? "Block" : "Activate")}
              style={u.superadmin ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            >
              <ToggleIcon active={u.active} />
            </button>
            <button
              className="admin-icon-btn danger"
              onClick={() => removeUser(u)}
              disabled={u.superadmin}
              aria-label="Remove"
              title={u.superadmin ? "Superadmins can't be removed" : "Remove"}
              style={u.superadmin ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
