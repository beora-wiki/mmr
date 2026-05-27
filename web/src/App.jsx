import { useState } from "react"
import Nav           from "./components/Nav"
import SchedulePage  from "./components/SchedulePage"
import VenuePage     from "./components/VenuePage"
import DirectoryPage from "./components/DirectoryPage"
import AreaGuidePage from "./components/AreaGuidePage"
import EmergencyPage from "./components/EmergencyPage"
import { EMERGENCY_CONTACTS } from "./data/static"

export default function App() {
  const [page, setPage]           = useState("schedule")
  const [showHost, setShowHost]   = useState(false)
  const jordan                    = EMERGENCY_CONTACTS[0]

  return (
    <>
      <header className="app-header">
        <div><h1>Memorable Retreat</h1><p>Santa Cruz · May 29-31</p></div>
        <button className="host-btn" onClick={() => setShowHost(true)}>Contact Host</button>
      </header>

      <main className="app-main">
        {page === "schedule"  && <SchedulePage setPage={setPage} />}
        {page === "venue"     && <VenuePage />}
        {page === "directory" && <DirectoryPage />}
        {page === "area"      && <AreaGuidePage />}
        {page === "emergency" && <EmergencyPage />}
      </main>

      <Nav page={page} setPage={setPage} />

      {showHost && (
        <div className="modal-overlay" onClick={() => setShowHost(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-label">Contact Host</div>
            <div className="modal-name">{jordan.name}</div>
            <div className="modal-role">{jordan.role}</div>
            <div className="modal-phone">{jordan.display}</div>
            <a href={"tel:" + jordan.phone} className="modal-call-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              Call {jordan.display}
            </a>
            <button className="modal-close-btn" onClick={() => setShowHost(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}
