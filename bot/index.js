const { Bot } = require("grammy")
const { default: Anthropic } = require("@anthropic-ai/sdk")
const fetch = (...args) => import("node-fetch").then(({default: f}) => f(...args))

const bot    = new Bot(process.env.TELEGRAM_BOT_TOKEN)
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ICS_URL     = process.env.SCHEDULE_ICS_URL
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY

const SYSTEM = `You are the AI assistant for the Memorable Men's Retreat — a men's AA recovery retreat at Villa Maria Del Mar, 21918 E Cliff Dr, Santa Cruz, CA 95062, May 29-31, 2026.

CONTEXT ASSUMPTIONS — never ask for clarification on these:
- Any question about meals, lunch, breakfast, dinner refers to the retreat schedule
- Any question about groups, meetings, sessions refers to retreat sessions
- Any question about "the next activity" or "what's happening" refers to the retreat schedule
- Any question about steps, working a step, the Big Book, sponsorship, AA principles refers to Alcoholics Anonymous
- Any question about finding a sponsor means finding an AA sponsor
- Any question about "the program" means AA
- Any question about sobriety, recovery, or staying sober is in the context of AA recovery

RETREAT FACTS:
- Host: Jordan Smith (310) 745-6161
- Backup contact: Alex Shohet (323) 899-9115
- Front desk: (831) 475-1236
- Emergency: Dominican Hospital, 1555 Soquel Dr, Santa Cruz (831) 462-7700
- House rule: Be respectful. This is a sober space.
- Web app: https://mmr.beora.ai
- Carpools from Santa Monica: Clayton (310) 980-9307, Ken W. (310) 450-0033
- One open spot available — contact Jordan if someone wants to join

AA KNOWLEDGE — how to respond:
- Step questions: answer with warmth and depth, the way a sponsor who has worked the steps would explain them — with lived texture, not clinical language
- Sponsor questions: acknowledge they are asking about finding an AA sponsor, explain what to look for at the retreat (someone with what they want, time in the program, working the steps), and suggest they speak to Jordan or raise it in a meeting
- Big Book questions: draw on your knowledge of AA literature
- Sobriety questions: respond with encouragement, warmth, and AA wisdom
- If someone shares a struggle: listen first, validate, then offer AA perspective if appropriate

TONE:
- Warm, grounded, direct — like a trusted friend in recovery
- Never clinical, never corporate, never preachy
- Brief responses unless someone clearly wants depth
- Plain text only — no asterisks, no hashtags, no markdown formatting
- Under 200 words unless the question genuinely calls for more`

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
      const summary = (block.match(/SUMMARY:(.+)/)  || [])[1]?.trim() || ""
      const dtLine  = (block.match(/DTSTART[^\r\n]*/) || [])[0] || ""
      const dtVal   = dtLine.includes(":") ? dtLine.split(":").slice(-1)[0].trim() : ""
      if (summary && dtVal) {
        const m = dtVal.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/)
        if (m) {
          const [,y,mo,d,h,mi] = m
          const dateObj = dtVal.endsWith("Z")
            ? new Date(`${y}-${mo}-${d}T${h}:${mi}:00Z`)
            : new Date(`${y}-${mo}-${d}T${h}:${mi}:00-07:00`)
          events.push({ summary, dateObj })
        }
      }
    })
    events.sort((a,b) => a.dateObj - b.dateObj)
    return events
  } catch(e) { return [] }
}

function formatSchedule(events) {
  if (!events.length) return "No events found."
  const lines = ["Full Retreat Schedule", "─".repeat(34)]
  let lastDay = ""
  events.forEach(ev => {
    const dayStr  = ev.dateObj.toLocaleDateString("en-US",  { weekday:"short", month:"short", day:"numeric", timeZone:"America/Los_Angeles" })
    const timeStr = ev.dateObj.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true, timeZone:"America/Los_Angeles" })
    if (dayStr !== lastDay) { if (lastDay) lines.push(""); lastDay = dayStr }
    lines.push(`${dayStr}  ·  ${timeStr} PDT  —  ${ev.summary}`)
  })
  lines.push(""); lines.push("Full app: https://mmr.beora.ai")
  return lines.join("\n")
}

function getScheduleContext(events) {
  const now    = new Date()
  const today  = now.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", timeZone:"America/Los_Angeles" })
  const todayEvents = events.filter(ev => {
    const evDay = ev.dateObj.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", timeZone:"America/Los_Angeles" })
    return evDay === today
  })
  const upcoming = todayEvents.filter(ev => ev.dateObj > now)
  const next     = upcoming[0]

  let context = `Today is ${today}.\n`
  if (todayEvents.length) {
    context += `Today's retreat schedule:\n`
    todayEvents.forEach(ev => {
      const t = ev.dateObj.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true, timeZone:"America/Los_Angeles" })
      const marker = next && ev.summary === next.summary ? " ← NEXT" : ""
      context += `  ${t} PDT — ${ev.summary}${marker}\n`
    })
  } else {
    context += "No retreat events scheduled for today.\n"
  }
  if (next) {
    const t = next.dateObj.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true, timeZone:"America/Los_Angeles" })
    context += `\nThe next event is ${next.summary} at ${t} PDT.`
  }
  return context
}

async function askClaude(userMessage, scheduleContext) {
  const systemWithContext = scheduleContext
    ? `${SYSTEM}\n\nLIVE SCHEDULE CONTEXT:\n${scheduleContext}`
    : SYSTEM
  const msg = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: systemWithContext,
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
      const label = new Date(item.dt * 1000).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", timeZone:"America/Los_Angeles" })
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
  `Welcome to the Memorable Men's Retreat!\n\nI'm here to help during May 29-31 at Villa Maria Del Mar, Santa Cruz.\n\nCommands:\n/schedule — Full retreat schedule\n/weather — Santa Cruz forecast\n/venue — Venue info and address\n/aa — Local AA meetings\n/reflection — Daily reflection\n/help — All commands\n\nOr ask me anything — about the schedule, the steps, sponsorship, or anything else.`
))

bot.command("help", ctx => ctx.reply(
  `Available commands:\n\n/schedule — Full retreat schedule\n/weather — Santa Cruz forecast\n/venue — Venue info\n/aa — Local AA meetings\n/reflection — AA daily reflection\n\nOr just ask me anything — schedule questions, AA questions, step work, finding a sponsor. I'm here.`
))

bot.command("venue", ctx => ctx.reply(
  `Villa Maria Del Mar\n21918 E Cliff Dr, Santa Cruz, CA 95062\n\nFront desk: (831) 475-1236\n\nRooms:\n- Main Chapel — sessions and speakers\n- Fireside Room — small groups\n- Dining Hall — all meals\n- Garden — outdoor space\n\nHouse rule: Be respectful. This is a sober space.`
))

bot.command("aa", ctx => ctx.reply(
  `Local AA Meetings near the venue:\n\n7:00 AM daily — Serenity Group\n226 Cathcart St, Santa Cruz\n\n7:30 AM daily — Daily Reflections\n444 Encinal St, Santa Cruz\n\n12:00 PM daily — Santa Cruz Central\n1111 Soquel Ave, Santa Cruz\n\n7:00 PM daily — Evening Group\n226 Cathcart St, Santa Cruz\n\nVerify times at santa-cruz-aa.org`
))

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
    "Give me a brief AA daily reflection — a short thought rooted in the 12-step tradition, followed by a one-sentence meditation. Keep it under 150 words. Warm and genuine. Plain text only.",
    null
  )
  await ctx.reply("Daily Reflection\n\n" + text)
})

bot.on("message:text", async ctx => {
  const text = ctx.message.text
  if (text.startsWith("/")) return
  try {
    await ctx.reply("...")
    const events          = await fetchSchedule()
    const scheduleContext = getScheduleContext(events)
    const reply           = await askClaude(text, scheduleContext)
    await ctx.reply(reply)
  } catch(e) {
    await ctx.reply("Something went wrong. Try again or visit https://mmr.beora.ai")
  }
})

bot.catch(err => { console.error("Bot error:", err) })
bot.start()
console.log("Memorable Retreat bot running.")
