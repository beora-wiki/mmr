const fs = require("node:fs")
const path = require("node:path")
const { google } = require("googleapis")

const READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"

let cachedClient = null

function resolveKeyFile() {
  const keyFromEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  const adc = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  const candidate = keyFromEnv || adc
  if (!candidate) return null

  const resolved = path.isAbsolute(candidate)
    ? candidate
    : path.resolve(process.cwd(), candidate)

  return fs.existsSync(resolved) ? resolved : null
}

function calendarClient() {
  if (cachedClient) return cachedClient
  const keyFile = resolveKeyFile()
  const auth = new google.auth.GoogleAuth({
    ...(keyFile ? { keyFile } : {}),
    scopes: [READONLY_SCOPE]
  })
  cachedClient = google.calendar({ version: "v3", auth })
  return cachedClient
}

function rowFromItem(item) {
  const startRaw = item.start?.dateTime ?? item.start?.date
  const endRaw = item.end?.dateTime ?? item.end?.date
  if (!startRaw || !endRaw || !item.id) return null
  return {
    uid: item.id,
    title: item.summary || "Untitled",
    start: new Date(startRaw).toISOString(),
    end: endRaw ? new Date(endRaw).toISOString() : null,
    location: item.location || "",
    description: (item.description || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }
}

async function fetchUpcoming(calendarId, maxResults = 100) {
  if (!calendarId) return []
  const calendar = calendarClient()
  const res = await calendar.events.list({
    calendarId,
    timeMin: new Date().toISOString(),
    singleEvents: true,
    maxResults,
    showDeleted: false,
    orderBy: "startTime"
  })
  const rows = []
  for (const item of res.data.items ?? []) {
    const row = rowFromItem(item)
    if (row) rows.push(row)
  }
  return rows
}

module.exports = { fetchUpcoming }
