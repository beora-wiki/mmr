import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { setSession, isAuthed, takePostLoginPath } from "../utils/auth"
import ParrotMascot from "./ParrotMascot"

const API_BASE = import.meta.env.VITE_API_URL || ""

export default function LoginPage() {
  const navigate = useNavigate()
  const [name, setName]       = useState("")
  const [email, setEmail]     = useState("")
  const [error, setError]     = useState("")
  const [loading, setLoading] = useState(false)

  if (isAuthed()) {
    navigate("/app", { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName  = name.trim()

    if (!trimmedName || !trimmedEmail) {
      setError("Please enter your name and email.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("That email doesn't look right.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: trimmedName, email: trimmedEmail })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Sign-in failed. Ask Red Door staff for access.")
        setLoading(false)
        return
      }
      setSession(data.token, {
        name:       data.name,
        email:      data.email,
        superadmin: data.superadmin === true
      })
      const next = takePostLoginPath()
      navigate(next || "/app", { replace: true })
    } catch {
      setError("Couldn't reach the server. Check your connection.")
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <ParrotMascot height={96} className="login-parrot" />
        <div className="login-wordmark">beora</div>
        <div className="login-tagline">Red Door · Concierge</div>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-field">
          <label className="login-label" htmlFor="name">Your Name</label>
          <input
            id="name"
            className="login-input"
            type="text"
            autoComplete="name"
            placeholder="First and last name"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="login-field">
          <label className="login-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="login-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <button className="login-cta" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>

        {error && <div className="login-error">{error}</div>}
      </form>

      <div className="login-footer">
        Access provided by Red Door staff
      </div>
    </div>
  )
}
