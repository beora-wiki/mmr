import { useEffect, useState } from "react"
import { apiFetch } from "../utils/auth"
import ParrotMascot from "./ParrotMascot"

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function fmtTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  })
}

function fmtDay(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  })
}

function dayKey(iso) {
  const d = new Date(iso)
  return d.toISOString().slice(0, 10)
}

function groupByDay(events) {
  return events.reduce((acc, ev) => {
    const k = dayKey(ev.start)
    if (!acc[k]) acc[k] = []
    acc[k].push(ev)
    return acc
  }, {})
}

export default function SchedulePage() {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await apiFetch("/api/schedule")
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data.error || "Couldn't load the schedule.")
        } else {
          setEvents(data.events || [])
        }
      } catch {
        if (!cancelled) setError("Couldn't reach the server.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="page">
        <h2 className="page-title">Schedule</h2>
        <p className="page-sub">Red Door · Today &amp; Upcoming</p>
        <div className="placeholder">
          <div className="spinner" />
          <p style={{ marginTop: 16, color: "var(--ink-3)" }}>Loading schedule…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <h2 className="page-title">Schedule</h2>
        <div className="error-banner">{error}</div>
      </div>
    )
  }

  const grouped  = groupByDay(events)
  const dayKeys  = Object.keys(grouped).sort()

  return (
    <div className="page">
      <h2 className="page-title">Schedule</h2>
      <p className="page-sub">Red Door · Today &amp; Upcoming</p>

      {events.length === 0 && (
        <div className="placeholder">
          <ParrotMascot height={72} className="placeholder-parrot" />
          <h3>Nothing scheduled</h3>
          <p>Upcoming events will appear here once they're on the calendar.</p>
        </div>
      )}

      {dayKeys.map(k => (
        <div key={k}>
          <div className="day-header">
            <span className="day-header-dot" />
            {fmtDay(grouped[k][0].start)}
          </div>

          {grouped[k].map((ev, i) => (
            <div key={ev.uid || i} className="event-card">
              <div className="event-time">
                {fmtTime(ev.start)}{ev.end ? ` – ${fmtTime(ev.end)}` : ""}
              </div>
              <div className="event-title">{ev.title}</div>

              {ev.location && (
                <div className="event-location">
                  <PinIcon /> {ev.location}
                </div>
              )}

              {ev.description && (
                <div className="event-desc">{ev.description}</div>
              )}

              {ev.source && (
                <div className="event-source">{ev.source}</div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
