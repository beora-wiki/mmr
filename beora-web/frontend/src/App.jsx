import { Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./components/LoginPage"
import AppShell from "./components/AppShell"
import AdminPage from "./components/AdminPage"
import { isAuthed } from "./utils/auth"

function RequireAuth({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthed() ? "/app" : "/login"} replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app/*" element={<RequireAuth><AppShell /></RequireAuth>} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
