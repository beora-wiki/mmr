const { Bot } = require("grammy")
const { default: Anthropic } = require("@anthropic-ai/sdk")
const fetch = (...args) => import("node-fetch").then(({default: f}) => f(...args))

const bot    = new Bot(process.env.TELEGRAM_BOT_TOKEN)
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ICS_URL     = process.env.SCHEDULE_ICS_URL
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY

const SYSTEM = `You are the Memorable Retreat assistant for a men's AA retreat at Villa Maria Del Mar, 21918 E Cliff Dr, Santa Cruz, CA 95062, May 29-31, 2026.

Your role: answer questions about the retreat, provide AA knowledge, offer encouragement, and support attendees with warmth and care.

Key facts:
- Host: Jordan Smith (310) 745-6161
- Backup: Alex Shohet (323) 899-9115
- Front desk: (831) 475-1236
- Emergency: Dominican Hospital, 1555 Soquel Dr, Santa Cruz (831) 462-7700
- AA only retreat focused on the 12 steps
- House rule: Be respectful. This is a sober space.
- Web app with full schedule: https://mmr.beora.ai

For AA questions, draw on the Big Book and 12-step principles. Be warm, grounded, and brief. This is a chat interface — keep responses under 200 words unless asked for more detail.`

async function fetchSchedule() {
  try {
    const res = await fetch(ICS_URL)
    const text = await res.text()
    const events = []
    const blocks = text.split("BEGIN:VEVENT").slice(1)
    blocks.forEach(block => {
      const summary  = (block.match(/SUMMARY:(.+)/)  || [])[1]?.trim() || ""
      const dtstart  = (block.match(/DTSTART[^:]*:(.+)/) || [])[1]?.trim() || ""
      const location = (block.match(/LOCATION:(.+)/) || [])[1]?.trim() || ""
      if (summary && dtstart) {
        const d = dtstart.replace(/T(\d{2})(\d{2}).*/, " $1:$2")
        events.push({ summary, time: d, location })
      }
    })
    return events
  } catch(e) { return [] }
}

function formatSchedule(events, dayFilter) {
  const filtered = dayFilter
    ? events.filter(e => e.time.includes(dayFilter))
    : events
  if (!filtered.length) return "No events found."
  return filtered.map(e =>
    `${e.time}  ${e.summary}${e.location ? " · " + e.location : ""}`
  ).join("\n")
}

async function askClaude(userMessage) {
  const msg = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: SYSTEM,
    messages: [{ role: "user", content: userMessage }]
  })
  return msg.content[0].text
}

async function getWeather() {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=36.9741&lon=-122.0308&units=imperial&appid=${WEATHER_KEY}`
    )
    const d = await res.json()
    const days = {}
    ;(d.list || []).forEach(item => {
      const date = new Date(item.dt * 1000)
      const label = date.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})
      if (!days[label]) days[label] = { high:-999, low:999, desc: item.weather[0].description }
      days[label].high = Math.max(days[label].high, item.main.temp_max)
      days[label].low  = Math.min(days[label].low,  item.main.temp_min)
    })
    const lines = Object.entries(days).slice(0,4).map(([day,w]) =>
      `${day}: ${Math.round(w.high)}°F / ${Math.round(w.low)}°F — ${w.desc}`
    )
    return "🌤 Santa Cruz Forecast\n\n" + lines.join("\n")
  } catch(e) { return "Weather unavailable right now." }
}

bot.command("start", ctx => ctx.reply(
  `Welcome to the Memorable Men's Retreat! 🙏\n\nI'm here to help during May 29-31 at Villa Maria Del Mar, Santa Cruz.\n\nCommands:\n/schedule — Full retreat schedule\n/weather — Santa Cruz forecast\n/venue — Venue info and address\n/aa — Local AA meetings\n/reflection — Daily reflection\n/help — All commands\n\nOr just ask me anything.`
))

bot.command("help", ctx => ctx.reply(
  `Available commands:\n\n/schedule — Full retreat schedule\n/weather — Santa Cruz forecast\n/venue — Venue info\n/aa — Local AA meetings\n/reflection — AA daily reflection\n\nOr ask me anything — I'm here to help.`
))

bot.command("venue", ctx => ctx.reply(
  `📍 Villa Maria Del Mar\n21918 E Cliff Dr, Santa Cruz, CA 95062\n\n📞 Front desk: (831) 475-1236\n\nRooms:\n• Main Chapel — sessions and speakers\n• Fireside Room — small groups\n• Dining Hall — all meals\n• Garden — outdoor space\n\nHouse rule: Be respectful. This is a sober space.`
))

bot.command("aa", ctx => ctx.reply(
  `Local AA Meetings near the venue:\n\n🕖 7:00 AM daily — Serenity Group\n   226 Cathcart St, Santa Cruz\n\n🕢 7:30 AM daily — Daily Reflections\n   444 Encinal St, Santa Cruz\n\n🕛 12:00 PM daily — Santa Cruz Central\n   1111 Soquel Ave, Santa Cruz\n\n🕖 7:00 PM daily — Evening Group\n   226 Cathcart St, Santa Cruz\n\n⚠️ Verify times at santa-cruz-aa.org`
))

bot.command("schedule", async ctx => {
  await ctx.reply("Fetching schedule...")
  const events = await fetchSchedule()
  if (!events.length) return ctx.reply("Could not load schedule. Check https://mmr.beora.ai")
  const text = formatSchedule(events)
  await ctx.reply(`📅 Full Retreat Schedule\n\n${text}\n\nFull app: https://mmr.beora.ai`)
})

bot.command("weather", async ctx => {
  await ctx.reply("Checking the forecast...")
  const text = await getWeather()
  await ctx.reply(text)
})

bot.command("reflection", async ctx => {
  await ctx.reply("Finding a reflection for you...")
  const text = await askClaude("Give me a brief AA daily reflection — a short thought rooted in the 12-step tradition, followed by a one-sentence meditation. Keep it under 150 words. Warm and genuine.")
  await ctx.reply(`🙏 Daily Reflection\n\n${text}`)
})

bot.on("message:text", async ctx => {
  const text = ctx.message.text
  if (text.startsWith("/")) return
  try {
    await ctx.reply("...")
    const reply = await askClaude(text)
    await ctx.reply(reply)
  } catch(e) {
    await ctx.reply("Something went wrong. Try again or visit https://mmr.beora.ai")
  }
})

bot.start()
console.log("Memorable Retreat bot running.")
