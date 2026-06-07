const { fetchUpcoming } = require("./googleCalendar")

let cache = null
let cachedAt = 0
const CACHE_MS = 5 * 60 * 1000

function getCalendars() {
  const ids = [
    process.env.GOOGLE_CALENDAR_ID,
    process.env.GOOGLE_MEALS_CALENDAR_ID,
    process.env.GOOGLE_HOUSEKEEPING_CALENDAR_ID,
    process.env.GOOGLE_ACTIVITIES_CALENDAR_ID
  ]
  const labels = [
    process.env.SCHEDULE_LABEL_1 || "Schedule",
    process.env.SCHEDULE_LABEL_2 || "Meals",
    process.env.SCHEDULE_LABEL_3 || "Housekeeping",
    process.env.SCHEDULE_LABEL_4 || "Activities"
  ]
  return ids
    .map((id, idx) => ({ id: id?.trim(), label: labels[idx] }))
    .filter(c => c.id)
}

async function fetchOne(calendarId, label) {
  try {
    const events = await fetchUpcoming(calendarId)
    return events.map(ev => ({ ...ev, source: label }))
  } catch (err) {
    console.error(JSON.stringify({
      msg: "calendar fetch failed",
      calendarId,
      err: err.message
    }))
    return []
  }
}

async function getEvents() {
  const now = Date.now()
  if (cache && (now - cachedAt) < CACHE_MS) {
    return cache
  }

  const calendars = getCalendars()
  if (calendars.length === 0) {
    cache = []
    cachedAt = now
    return cache
  }

  const all = await Promise.all(calendars.map(c => fetchOne(c.id, c.label)))
  const flat = all.flat()

  const byUid = new Map()
  for (const ev of flat) {
    if (!ev.uid) continue
    if (!byUid.has(ev.uid)) byUid.set(ev.uid, ev)
  }

  const events = [...byUid.values()]
    .filter(ev => ev.start)
    .sort((a, b) => new Date(a.start) - new Date(b.start))

  cache = events
  cachedAt = now
  return events
}

function getEventsForContext(events) {
  const now = new Date()
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  return events.filter(ev => {
    const start = new Date(ev.start)
    return start >= new Date(now.getTime() - 60 * 60 * 1000) && start <= horizon
  })
}

function formatScheduleForAgent(events) {
  if (events.length === 0) return "No upcoming events on the schedule right now."

  const tz = process.env.SCHEDULE_TIMEZONE || process.env.FACILITY_TIMEZONE || "America/Los_Angeles"
  const lines = events.map(ev => {
    const d = new Date(ev.start)
    const day = d.toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", timeZone: tz
    })
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz
    })
    const loc = ev.location ? ` @ ${ev.location}` : ""
    const src = ev.source ? ` [${ev.source}]` : ""
    return `- ${day} ${time} — ${ev.title}${loc}${src}`
  })
  return "UPCOMING RED DOOR SCHEDULE (next 7 days, all 4 calendars merged):\n" + lines.join("\n")
}

module.exports = { getEvents, getEventsForContext, formatScheduleForAgent }
