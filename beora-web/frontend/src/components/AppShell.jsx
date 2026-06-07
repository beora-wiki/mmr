import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import Nav from "./Nav"
import ChatPage from "./ChatPage"
import SchedulePage from "./SchedulePage"
import { clearSession, isSuperAdmin } from "../utils/auth"
import ParrotMascot from "./ParrotMascot"

export default function AppShell() {
  const navigate = useNavigate()
  const isSuper  = isSuperAdmin()

  function signOut() {
    clearSession()
    navigate("/login", { replace: true })
  }

  return (
    <>
      <header className="app-header">
        <div className="app-header-brand">
          <ParrotMascot height={28} className="app-header-parrot" />
          <span className="app-header-wordmark">beora</span>
          <span className="app-header-divider" />
          <span className="app-header-facility">Red Door</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {isSuper && (
            <button
              className="app-header-signout"
              onClick={() => navigate("/admin")}
              aria-label="Admin dashboard"
              style={{ color: "var(--iodine-700)" }}
            >
              Admin
            </button>
          )}
          <button className="app-header-signout" onClick={signOut} aria-label="Sign out">
            Sign Out
          </button>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route index element={<Navigate to="chat" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="*" element={<Navigate to="chat" replace />} />
        </Routes>
      </main>

      <Nav />
    </>
  )
}
