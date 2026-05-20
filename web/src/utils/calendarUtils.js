function gcalDate(d) {
  return d.toISOString().replace(/[-:.]/g,"").slice(0,15) + "Z"
}
export function googleCalUrl(ev) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: gcalDate(ev.start) + "/" + gcalDate(ev.end),
    details: ev.description,
    location: ev.location,
  })
  return "https://calendar.google.com/calendar/render?" + p
}
export function downloadICS(events, filename) {
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Memorable Retreat//EN","CALSCALE:GREGORIAN"]
  events.forEach(e => {
    lines.push("BEGIN:VEVENT")
    lines.push("SUMMARY:" + e.title)
    lines.push("DTSTART:" + gcalDate(e.start))
    lines.push("DTEND:"   + gcalDate(e.end))
    if (e.location)    lines.push("LOCATION:"    + e.location)
    if (e.description) lines.push("DESCRIPTION:" + e.description)
    lines.push("UID:" + e.uid)
    lines.push("END:VEVENT")
  })
  lines.push("END:VCALENDAR")
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename || "schedule.ics"
  a.click()
}
