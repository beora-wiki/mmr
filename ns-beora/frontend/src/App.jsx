import { useState, useEffect } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { onAuthChange } from "./utils/firebase"
import LoginPage from "./components/LoginPage"
import AppShell from "./components/AppShell"

export default function App() {
  const [authState, setAuthState] = useState("loading") // loading | authed | anon

  useEffect(() => {
    const unsub = onAuthChange(user => {
      setAuthState(user ? "authed" : "anon")
    })
    return unsub
  }, [])

  if (authState === "loading") {
    return (
      <div className="auth-loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={authState === "authed" ? <Navigate to="/app" replace /> : <LoginPage />}
      />
      <Route
        path="/app/*"
        element={authState === "authed" ? <AppShell /> : <Navigate to="/login" replace />}
      />
      <Route
        path="*"
        element={<Navigate to={authState === "authed" ? "/app" : "/login"} replace />}
      />
    </Routes>
  )
}
