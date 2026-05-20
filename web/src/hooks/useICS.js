import { useState, useEffect } from "react"
import ICAL from "ical.js"

export function useICS(url) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!url) { setError("no_url"); setLoading(false); return }
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text() })
      .then(text => {
        const jcal = ICAL.parse(text)
        const comp = new ICAL.Component(jcal)
        const vevents = comp.getAllSubcomponents("vevent")
        const parsed = vevents.map(ve => {
          const ev = new ICAL.Event(ve)
          return {
            uid:         ev.uid,
            title:       ev.summary      || "Untitled",
            start:       ev.startDate.toJSDate(),
            end:         ev.endDate.toJSDate(),
            location:    ev.location     || "",
            description: ev.description || "",
          }
        }).sort((a,b) => a.start - b.start)
        setEvents(parsed)
        setLoading(false)
      })
      .catch(() => { setError("fetch_failed"); setLoading(false) })
  }, [url])

  return { events, loading, error }
}
