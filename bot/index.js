const { Bot } = require("grammy")
const { default: Anthropic } = require("@anthropic-ai/sdk")
const fetch = (...args) => import("node-fetch").then(({default: f}) => f(...args))

const bot    = new Bot(process.env.TELEGRAM_BOT_TOKEN)
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ICS_URL      = process.env.SCHEDULE_ICS_URL
const WEATHER_KEY  = process.env.OPENWEATHER_API_KEY
const SHEETS_KEY   = process.env.SHEETS_API_KEY
const SHEETS_ID    = process.env.SHEETS_SPREADSHEET_ID

const SYSTEM = `You are the AI assistant for the Memorable Men's Retreat — a men's AA recovery retreat at Villa Maria Del Mar, 21918 E Cliff Dr, Santa Cruz, CA 95062, May 29-31, 2026.

CRITICAL INSTRUCTIONS:
- You will receive the COMPLETE retreat schedule and attendee directory in your context on every message
- Always use the exact schedule data to answer schedule questions — never make up times or events
- Always use the exact directory data to answer contact questions — never make up contact info
- If someone asks about an attendee, look them up in the directory and share their info
- Never say you don't have schedule or directory information

CONTEXT ASSUMPTIONS:
- Questions about meals, groups, sessions refer to the retreat schedule
- Questions about steps, the Big Book, sponsorship refer to Alcoholics Anonymous
- Questions about finding a sponsor mean finding an AA sponsor
- "The program" means AA

RETREAT CONTACTS:
- Host: Jordan Smith (310) 745-6161
- Backup: Alex Shohet (323) 899-9115
- Front desk: (831) 475-1236
- Emergency: Dominican Hospital, 1555 Soquel Dr, Santa Cruz (831) 462-7700
- Web app: https://mmr.beora.ai

AA KNOWLEDGE:
- Step questions: answer warmly, the way a sponsor who has worked the steps would
- Sponsor questions: explain what to look for, suggest speaking to Jordan or raising it in a meeting
- Sobriety struggles: listen first, validate, then offer AA perspective

TONE: Warm, grounded, direct. Never clinical or preachy. Plain text only — no asterisks, hashtags, or markdown. Under 200 words unless the question genuinely needs more.`

function stripMarkdown(text) {
  return text
    .replace(/\*\*/g, "").replace(/\*/g, "")
    .replace(/^#{1,6}\s/gm, "").replace(/_{1,2}/g, "")
    .replace(/`{1,3}/g, "").trim()
}

async function fetchSchedule() {
  try {
    const res    = await fetch(ICS_URL)
    const text   = await res.text()
    const events = []
    const blocks = text.split("BEGIN:VEVENT").slice(1)
    blocks.forEach(block => {
      const summary  = (block.match(/SUMMARY:(.+)/)  || [])[1]?.trim() || ""
      const dtLine   = (block.match(/DTSTART[^\r\n]*/) || [])[0] || ""
      const dtVal    = dtLine.includes(":") ? dtLine.split(":").slice(-1)[0].trim() : ""
      const descLine = (block.match(/DESCRIPTION:(.+)/) || [])[1]?.trim() || ""
      if (summary && dtVal) {
        const m = dtVal.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/)
        if (m) {
          const [,y,mo,d,h,mi] = m
          const dateObj = dtVal.endsWith("Z")
            ? new Date(`${y}-${mo}-${d}T${h}:${mi}:00Z`)
            : new Date(`${y}-${mo}-${d}T${h}:${mi}:00-07:00`)
          events.push({ summary, dateObj, desc: descLine })
        }
      }
    })
    events.sort((a,b) => a.dateObj - b.dateObj)
    return events
  } catch(e) { return [] }
}

async function fetchContacts() {
  try {
    if (!SHEETS_KEY || !SHEETS_ID) return []
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/A:F?key=${SHEETS_KEY}`
    const res  = await fetch(url)
    const json = await res.json()
    const rows = json.values || []
    return rows.slice(1)
      .filter(row => row[5] && row[5].toLowerCase().includes("yes"))
      .map(row => ({
        room:  row[0] || "",
        name:  row[1] || "",
        email: row[2] || "",
        phone: row[3] || "",
        city:  row[4] || "",
      }))
      .filter(c => c.name)
  } catch(e) { return [] }
}

function getScheduleContext(events) {
  const now   = new Date()
  const today = now.toLocaleDateString("en-US", {
    weekday:"long", month:"long", day:"numeric", timeZone:"America/Los_Angeles"
  })
  let context = `Today is ${today} (Pacific Time).\n\nCOMPLETE RETREAT SCHEDULE:\n`
  let lastDay = ""
  events.forEach(ev => {
    const dayStr  = ev.dateObj.toLocaleDateString("en-US", {
      weekday:"long", month:"long", day:"numeric", timeZone:"America/Los_Angeles"
    })
    const timeStr = ev.dateObj.toLocaleTimeString("en-US", {
      hour:"numeric", minute:"2-digit", hour12:true, timeZone:"America/Los_Angeles"
    })
    if (dayStr !== lastDay) { context += `\n--- ${dayStr} ---\n`; lastDay = dayStr }
    context += `  ${timeStr} — ${ev.summary}`
    if (ev.desc) context += ` (${ev.desc.substring(0,120).replace(/\\n/g," ")})`
    context += `\n`
  })
  const next = events.filter(ev => ev.dateObj > now)[0]
  if (next) {
    const t = next.dateObj.toLocaleTimeString("en-US", {
      hour:"numeric", minute:"2-digit", hour12:true, timeZone:"America/Los_Angeles"
    })
    const d = next.dateObj.toLocaleDateString("en-US", {
      weekday:"long", timeZone:"America/Los_Angeles"
    })
    context += `\nNEXT UPCOMING EVENT: ${next.summary} at ${t} PDT on ${d}.`
  }
  return context
}

function getContactsContext(contacts) {
  if (!contacts.length) return ""
  let context = "\n\nATTENDEE DIRECTORY (these attendees have opted in to share their info):\n"
  contacts.forEach(c => {
    context += `\n${c.name}`
    if (c.room)  context += ` — Room ${c.room}`
    if (c.city)  context += ` — ${c.city}`
    if (c.email) context += ` — ${c.email}`
    if (c.phone) context += ` — ${c.phone}`
    context += "\n"
  })
  return context
}

function formatSchedule(events) {
  if (!events.length) return "No events found."
  const lines = ["Full Retreat Schedule", "─".repeat(34)]
  let lastDay = ""
  events.forEach(ev => {
    const dayStr  = ev.dateObj.toLocaleDateString("en-US", {
      weekday:"short", month:"short", day:"numeric", timeZone:"America/Los_Angeles"
    })
    const timeStr = ev.dateObj.toLocaleTimeString("en-US", {
      hour:"numeric", minute:"2-digit", hour12:true, timeZone:"America/Los_Angeles"
    })
    if (dayStr !== lastDay) { if (lastDay) lines.push(""); lastDay = dayStr }
    lines.push(`${dayStr}  ·  ${timeStr} PDT  —  ${ev.summary}`)
  })
  lines.push(""); lines.push("Full app: https://mmr.beora.ai")
  return lines.join("\n")
}

async function askClaude(userMessage, context) {
  const msg = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: SYSTEM + "\n\n" + context,
    messages: [{ role: "user", content: userMessage }]
  })
  return stripMarkdown(msg.content[0].text)
}

async function getWeather() {
  try {
    const res  = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=36.9741&lon=-122.0308&units=imperial&appid=${WEATHER_KEY}`)
    const d    = await res.json()
    const days = {}
    ;(d.list || []).forEach(item => {
      const label = new Date(item.dt * 1000).toLocaleDateString("en-US", {
        weekday:"short", month:"short", day:"numeric", timeZone:"America/Los_Angeles"
      })
      if (!days[label]) days[label] = { high:-999, low:999, desc: item.weather[0].description }
      days[label].high = Math.max(days[label].high, item.main.temp_max)
      days[label].low  = Math.min(days[label].low,  item.main.temp_min)
    })
    const lines = Object.entries(days).slice(0,4).map(([day,w]) =>
      `${day}: ${Math.round(w.high)}F / ${Math.round(w.low)}F — ${w.desc}`
    )
    return "Santa Cruz Forecast\n\n" + lines.join("\n")
  } catch(e) { return "Weather unavailable right now." }
}

bot.command("start", ctx => ctx.reply(
  `Welcome to the Memorable Men's Retreat!\n\nI'm here to help during May 29-31 at Villa Maria Del Mar, Santa Cruz.\n\nCommands:\n/schedule — Full retreat schedule\n/weather — Santa Cruz forecast\n/venue — Venue info and address\n/aa — Local AA meetings\n/reflection — Daily reflection\n/help — All commands\n\nOr ask me anything — schedule, contacts, AA questions, step work.`
))

bot.command("help", ctx => ctx.reply(
  `Available commands:\n\n/schedule — Full retreat schedule\n/weather — Santa Cruz forecast\n/venue — Venue info\n/aa — Local AA meetings\n/reflection — AA daily reflection\n\nOr ask me anything — schedule, attendee contacts, AA questions, step work, finding a sponsor.`
))

bot.command("venue", ctx => ctx.reply(
  `Villa Maria Del Mar\n21918 E Cliff Dr, Santa Cruz, CA 95062\n\nFront desk: (831) 475-1236\n\nRooms:\n- Main Chapel — sessions and speakers\n- Fireside Room — small groups\n- Dining Hall — all meals\n- Garden — outdoor space\n\nHouse rule: Be respectful. This is a sober space.`
))

bot.command("aa", ctx => ctx.reply(
  `Local AA Meetings near the venue:\n\n7:00 AM daily — Serenity Group\n226 Cathcart St, Santa Cruz\n\n7:30 AM daily — Daily Reflections\n444 Encinal St, Santa Cruz\n\n12:00 PM daily — Santa Cruz Central\n1111 Soquel Ave, Santa Cruz\n\n7:00 PM daily — Evening Group\n226 Cathcart St, Santa Cruz\n\nVerify times at santa-cruz-aa.org`
))


bot.command("directory", async ctx => {
  await ctx.reply("Loading directory...")
  const contacts = await fetchContacts()
  if (!contacts.length) return ctx.reply("No contacts loaded. Check SHEETS_API_KEY and SHEETS_SPREADSHEET_ID in Railway variables.")
  const lines = ["Retreat Directory", "─".repeat(30)]
  contacts.forEach(c => {
    lines.push("")
    lines.push(c.name + (c.room ? "  —  Room " + c.room : ""))
    if (c.city)  lines.push(c.city)
    if (c.email) lines.push(c.email)
    if (c.phone) lines.push(c.phone)
  })
  await ctx.reply(lines.join("\n"))
})

bot.command("schedule", async ctx => {
  await ctx.reply("Fetching schedule...")
  const events = await fetchSchedule()
  if (!events.length) return ctx.reply("Could not load schedule. Check https://mmr.beora.ai")
  await ctx.reply(formatSchedule(events))
})

bot.command("weather", async ctx => {
  await ctx.reply("Checking the forecast...")
  await ctx.reply(await getWeather())
})

bot.command("reflection", async ctx => {
  await ctx.reply("Finding a reflection for you...")
  const text = await askClaude(
    "Give me a brief AA daily reflection — a short thought rooted in the 12-step tradition, followed by a one-sentence meditation. Under 150 words. Warm and genuine. Plain text only.",
    ""
  )
  await ctx.reply("Daily Reflection\n\n" + text)
})

bot.on("message:text", async ctx => {
  const text = ctx.message.text
  if (text.startsWith("/")) return
  try {
    await ctx.reply("...")
    const [events, contacts]  = await Promise.all([fetchSchedule(), fetchContacts()])
    const context = getScheduleContext(events) + getContactsContext(contacts)
    const reply   = await askClaude(text, context)
    await ctx.reply(reply)
  } catch(e) {
    await ctx.reply("Something went wrong. Try again or visit https://mmr.beora.ai")
  }
})

bot.catch(err => { console.error("Bot error:", err) })
bot.start()
console.log("Memorable Retreat bot running.")
