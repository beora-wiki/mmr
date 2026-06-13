import { useState, useEffect } from "react"
import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { signOut, auth } from "../utils/firebase"
import { apiFetch } from "../utils/auth"
import Nav from "./Nav"
import CoachPage from "./CoachPage"
import RewardsPage from "./RewardsPage"
import ParrotMascot from "./ParrotMascot"

export default function AppShell() {
  const navigate   = useNavigate()
  const [user, setUser]         = useState(null)
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const firebaseUser = auth.currentUser
        if (!firebaseUser) return

        const res  = await apiFetch("/api/profile")
        const data = await res.json()
        if (!cancelled) {
          setUser(data.user)
          setProfile(data.user?.profile || {})
        }
      } catch {
        // network failure — still render, CoachPage handles empty state
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    bootstrap()
    return () => { cancelled = true }
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate("/login", { replace: true })
  }

  function onProfileUpdate(updatedUser) {
    setUser(updatedUser)
    setProfile(updatedUser?.profile || {})
  }

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <>
      <header className="app-header">
        <div className="app-header-brand">
          <ParrotMascot height={28} className="app-header-parrot" />
          <span className="app-header-wordmark">beora</span>
          <span className="app-header-divider" />
          <span className="app-header-facility">Quit Coach</span>
        </div>
        <button className="app-header-signout" onClick={handleSignOut} aria-label="Sign out">
          Sign Out
        </button>
      </header>

      <main className="app-main">
        <Routes>
          <Route index element={<Navigate to="coach" replace />} />
          <Route
            path="coach"
            element={<CoachPage user={user} onProfileUpdate={onProfileUpdate} />}
          />
          <Route
            path="rewards"
            element={<RewardsPage user={user} />}
          />
          <Route path="*" element={<Navigate to="coach" replace />} />
        </Routes>
      </main>

      <Nav />
    </>
  )
}
