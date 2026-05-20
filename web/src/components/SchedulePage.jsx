import { useICS } from "../hooks/useICS"
import { googleCalUrl, downloadICS } from "../utils/calendarUtils"

const ICS_URL = import.meta.env.VITE_SCHEDULE_ICS_URL

function fmt(d, mode) {
  if (mode === "time") return d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true})
  if (mode === "day")  return d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})
}
function groupByDay(events) {
  return events.reduce((acc, ev) => {
    const key = ev.start.toDateString()
    if (!acc[key]) acc[key] = []
    acc[key].push(ev)
    return acc
  }, {})
}
function CalIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function DownIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function PinIcon()  { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> }

export default function SchedulePage() {
  const { events, loading, error } = useICS(ICS_URL)

  if (loading) return (
    <div className="page">
      <h2 className="page-title">Schedule</h2>
      <p className="page-sub">May 29-31 · Villa Maria Del Mar</p>
      <div className="placeholder"><div className="spinner"/><p style={{marginTop:16}}>Loading schedule...</p></div>
    </div>
  )
  if (error === "no_url") return (
    <div className="page">
      <h2 className="page-title">Schedule</h2>
      <div className="warning" style={{marginTop:20}}>Calendar URL not configured.</div>
    </div>
  )
  if (error) return (
    <div className="page">
      <h2 className="page-title">Schedule</h2>
      <div className="warning" style={{marginTop:20}}>Could not load the schedule. Check your connection and try again.</div>
    </div>
  )

  const grouped = groupByDay(events)
  const days = Object.keys(grouped)

  return (
    <div className="page">
      <h2 className="page-title">Schedule</h2>
      <p className="page-sub">May 29-31 · Villa Maria Del Mar</p>
      {events.length > 0 && (
        <button className="dl-btn" onClick={() => downloadICS(events, "memorable-retreat-full.ics")}>
          <DownIcon/> Download Full Schedule
        </button>
      )}
      {days.map(day => (
        <div key={day}>
          <div className="day-header">{fmt(grouped[day][0].start, "day").toUpperCase()}</div>
          {grouped[day].map((ev, i) => (
            <div key={i} className="event-card">
              <div className="event-time">{fmt(ev.start,"time")} – {fmt(ev.end,"time")}</div>
              <div className="event-title">{ev.title}</div>
              {ev.location && <div className="event-location"><PinIcon/> {ev.location}</div>}
              {ev.description && <div className="event-desc">{ev.description}</div>}
              <div className="event-actions">
                <a href={googleCalUrl(ev)} target="_blank" rel="noreferrer" className="event-btn event-btn-outline">
                  <CalIcon/> Google Calendar
                </a>
                <button className="event-btn event-btn-outline" onClick={() => downloadICS([ev], ev.title.replace(/\s+/g,"-") + ".ics")}>
                  <DownIcon/> Add to Calendar
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
      {events.length === 0 && (
        <div className="placeholder">
          <h3>No events yet</h3>
          <p>Events will appear here once added to the Google Calendar.</p>
        </div>
      )}
    </div>
  )
}
