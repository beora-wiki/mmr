import { useState } from "react"
import Nav           from "./components/Nav"
import SchedulePage  from "./components/SchedulePage"
import VenuePage     from "./components/VenuePage"
import DirectoryPage from "./components/DirectoryPage"
import AreaGuidePage from "./components/AreaGuidePage"
import EmergencyPage from "./components/EmergencyPage"
import { EMERGENCY_CONTACTS } from "./data/static"

export default function App() {
  const [page, setPage] = useState("schedule")
  const jordan = EMERGENCY_CONTACTS[0]
  return (
    <>
      <header className="app-header">
        <div><h1>Memorable Retreat</h1><p>Santa Cruz · May 29-31</p></div>
        <a href={"tel:" + jordan.phone} className="host-btn">Contact Host</a>
      </header>
      <main className="app-main">
        {page === "schedule"  && <SchedulePage />}
        {page === "venue"     && <VenuePage />}
        {page === "directory" && <DirectoryPage />}
        {page === "area"      && <AreaGuidePage />}
        {page === "emergency" && <EmergencyPage />}
      </main>
      <Nav page={page} setPage={setPage} />
    </>
  )
}
