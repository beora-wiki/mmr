const { Bot } = require("grammy")
const { default: Anthropic } = require("@anthropic-ai/sdk")
const fetch = (...args) => import("node-fetch").then(({default: f}) => f(...args))

const bot    = new Bot(process.env.TELEGRAM_BOT_TOKEN)
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ICS_URL      = process.env.SCHEDULE_ICS_URL
const WEATHER_KEY  = process.env.OPENWEATHER_API_KEY
const SHEETS_KEY   = process.env.SHEETS_API_KEY
const SHEETS_ID    = process.env.SHEETS_SPREADSHEET_ID

// ── Logging ───────────────────────────────────────────────────────────────────
function log(category, sub) {
  console.log(JSON.stringify({
    ts:  new Date().toISOString(),
    cat: category,
    sub: sub || ""
  }))
}

// ── Detection ─────────────────────────────────────────────────────────────────
function detectHALT(text) {
  const t = text.toLowerCase()
  if (/hungry|starving|haven.t eaten|need food|no food/.test(t))                       return "hungry"
  if (/angry|rage|furious|pissed|resentful|frustrated|want to scream/.test(t))         return "angry"
  if (/lonely|alone|isolated|nobody|no one|left out|invisible/.test(t))                return "lonely"
  if (/tired|exhausted|can.t sleep|insomnia|worn out|drained|no energy/.test(t))       return "tired"
  return null
}

function detectMilestone(text) {
  return /(\d+)\s*(year|month|day|week)s?\s*(sober|clean|sobriety)|sober anniversary|sobriety birthday|picked up (a|my) chip|anniversary (is|was)|hit \d/.test(text.toLowerCase())
}

function classifyMessage(text) {
  const t = text.toLowerCase()
  if (/step \d|what is step|how do i work step|step work/.test(t))        return "aa_step"
  if (/sponsor|big book|meeting|home group|slip|relapse|sober|sobriety|program|tradition|amends|inventory|resentment|character defect/.test(t)) return "aa_general"
  if (/schedule|lunch|breakfast|dinner|what time|next event|morning meeting|session|group/.test(t)) return "schedule"
  if (/contact|phone|email|room number|who is|directory/.test(t))         return "contact"
  if (/venue|wifi|chapel|garden|address|directions/.test(t))              return "venue"
  if (detectMilestone(t))                                                  return "milestone"
  if (detectHALT(t))                                                       return "halt"
  return "general"
}

// ── 12 Steps ──────────────────────────────────────────────────────────────────
const STEPS = {
  1: `Step 1: "We admitted we were powerless over alcohol — that our lives had become unmanageable."\n\nThis is surrender — not defeat. The paradox is that admitting powerlessness is the first real act of power. You stopped fighting something you couldn't win. That's not failure. That's honesty, maybe for the first time.\n\nMost of us fought this one the longest. The manageability question is the key: look at what your life actually looked like, not what you told yourself it was. When the evidence lines up, Step 1 stops being a confession and starts being a relief.`,

  2: `Step 2: "Came to believe that a Power greater than ourselves could restore us to sanity."\n\nYou don't have to define God. You just have to crack the door open. For a lot of us the starting point was simply: "Not me." My own thinking got me here. Something outside my own head might do better.\n\nThe group itself was enough for many people early on — something greater than one person, with experience and collective wisdom. Sanity isn't perfection. It's a return to choices that align with who you actually want to be.\n\nCame to believe is three words. It's a process, not an event.`,

  3: `Step 3: "Made a decision to turn our will and our lives over to the care of God as we understood Him."\n\nDeciding isn't doing — you'll make this decision again and again. Every morning. Sometimes every hour. The word decision matters: it's not a feeling. It's a choice.\n\nTurning over your will doesn't mean becoming passive. It means the relentless self-management that exhausted you isn't yours to carry alone anymore. The relief usually comes later, sometimes much later. Trust the step anyway.`,

  4: `Step 4: "Made a searching and fearless moral inventory of ourselves."\n\nNot a confession. Not a punishment. A fact-finding mission. The Big Book gives you the structure: resentments, fears, harms to others, sexual conduct. Four columns. What happened, what it threatened, my part, what it revealed about me.\n\nMost people are surprised: the resentments and fears that were running their life look smaller on paper. And the patterns become visible — the same five fears showing up in thirty different resentments.\n\nSearching and fearless. Don't edit. Get it out of your head and onto the page.`,

  5: `Step 5: "Admitted to God, to ourselves, and to another human being the exact nature of our wrongs."\n\nThis is the step that breaks isolation. Not the events — the patterns. The exact nature. You sit with your sponsor and read what you wrote. And when you're done, they're still sitting across from you.\n\nThe shame loses its power when it's spoken out loud and someone is still there. "We are as sick as our secrets" is in the literature because it's true.\n\nMost people describe Step 5 as the first time they felt truly known and still accepted. That experience is the foundation of everything that follows.`,

  6: `Step 6: "Were entirely ready to have God remove all these defects of character."\n\nReady. Not fixed. Not done. Ready.\n\nThis is a step about willingness, not performance. The defects that kept you sick are often the same ones that kept you alive — the controlling, the people-pleasing, the rage that felt like protection. Being entirely ready means acknowledging they don't serve you anymore, even when part of you still reaches for them.\n\nSit with this one. Don't rush past it to get to the prayer.`,

  7: `Step 7: "Humbly asked Him to remove our shortcomings."\n\nHumbly. That word does a lot of work.\n\nThe Seventh Step prayer is one sentence: "My Creator, I am now willing that you should have all of me, good and bad. I pray that you now remove from me every single defect of character which stands in the way of my usefulness to you and my fellows. Grant me strength, as I go out from here, to do your bidding."\n\nYou say it. Then you get up and act differently. The removal often looks like having the defect and choosing not to act on it — until one day you notice it isn't pulling as hard.`,

  8: `Step 8: "Made a list of all persons we had harmed, and became willing to make amends to them all."\n\nJust a list. Willingness comes separately — that's why the step says "became willing," not "made amends."\n\nMany people include themselves. Most people's lists are longer than they expected and shorter than they feared. The point isn't to know yet how you'll make the amends. The point is to look honestly at the wreckage and become open to repairing it.\n\nYour sponsor helps you build the list. Don't filter it yourself.`,

  9: `Step 9: "Made direct amends to such people wherever possible, except when to do so would injure them or others."\n\nDirect means in person when possible. An amends isn't an apology — it's a change in behavior. Some people get a conversation. Some get years of changed conduct. Some need to wait. A few can never be made directly.\n\nYour sponsor helps you sort which is which. The goal isn't to feel better. It's to repair what you broke. The feeling better is a side effect of doing the right thing.\n\nThe Ninth Step promises in the Big Book describe what happens on the other side. Most people find them to be true.`,

  10: `Step 10: "Continued to take personal inventory and when we were wrong promptly admitted it."\n\nThe maintenance step. You keep doing this because the things that drove you to drink don't disappear — you just get better at catching them before they build.\n\nPromptly is the hard part. Before the justification starts. Before the story forms. When you're wrong, you say so. That night, or the next morning at the latest.\n\nA lot of people do a brief written inventory before bed. What happened today, what was my part, what do I need to address tomorrow. It keeps the slate clean.`,

  11: `Step 11: "Sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out."\n\nPrayer is speaking. Meditation is listening. Most of us were only doing one.\n\nConscious contact doesn't require certainty about what God is. It requires showing up — five minutes in the morning, asking for guidance, being willing to be quiet. The literature suggests starting with gratitude. Ending with: what should I do today. The silence in between is the practice.\n\nIt works. Even when it doesn't feel like anything is happening.`,

  12: `Step 12: "Having had a spiritual awakening as the result of these steps, we tried to carry this message to alcoholics, and to practice these principles in all our affairs."\n\nA spiritual awakening doesn't have to be a lightning bolt. For most of us it was gradual: the morning we realized we weren't white-knuckling it anymore. That we were genuinely okay.\n\nNow you carry it. Not because you're supposed to. Because it's the only way it stays alive in you.\n\nService isn't optional in this program — it's the mechanism. You keep what you have by giving it away. That's not a saying. That's the design.`
}

// ── System Prompt ─────────────────────────────────────────────────────────────
const SYSTEM = `You are the AI assistant for the Memorable Men's Retreat — a men's AA recovery retreat at Villa Maria Del Mar, 21918 E Cliff Dr, Santa Cruz, CA 95062, May 29-31, 2026.

AA CULTURAL INTELLIGENCE — THE MOST IMPORTANT INSTRUCTIONS:
- You follow the spirit of AA's "no cross-talk" tradition. Never give directive advice, never diagnose, never lecture, never tell someone what they should do.
- Frame guidance as: "The literature suggests...", "In my experience...", "What I've seen work is...", "The program offers...", "Many people find that..."
- Share from experience, strength, and hope — not from authority.
- If someone shares a struggle, validate first. Always. Then offer the fellowship perspective if appropriate.
- You never speak as a clinician, therapist, or authority figure. You speak as a trusted friend in recovery who happens to know the schedule.
- Anonymity matters. Never reference other people by name when someone shares about them.

HALT AWARENESS:
- If someone seems Hungry, Angry, Lonely, or Tired — name it gently before anything else.
- "That sounds like it might be hitting the HALT — are you hungry, angry, lonely, or tired right now?"
- Then respond to the feeling before the question.

MILESTONE RECOGNITION:
- When someone shares a sobriety anniversary or milestone, stop everything and honor it.
- Respond with genuine warmth, as if you're the first person in the room to hear it.
- A short, specific, heartfelt acknowledgment. Not a speech. Something that lands.

CONTEXT ASSUMPTIONS — never ask for clarification:
- Questions about meals, groups, sessions refer to the retreat schedule
- Questions about steps, Big Book, sponsorship refer to Alcoholics Anonymous
- "The program" means AA
- Finding a sponsor means an AA sponsor

RETREAT CONTACTS:
- Host: Jordan Smith (310) 745-6161
- Backup: Alex Shohet (323) 899-9115
- Front desk: (831) 475-1236
- Emergency: Dominican Hospital, 1555 Soquel Dr, Santa Cruz (831) 462-7700
- Web app: https://mmr.beora.ai

TONE: Warm, grounded, honest. The voice of someone who has been around the rooms for years and genuinely cares. Never clinical. Never corporate. Never preachy. Plain text only — no asterisks, hashtags, or markdown. Under 200 words unless the question needs more.`

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripMarkdown(text) {
  return text
    .replace(/\*\*/g,"").replace(/\*/g,"")
    .replace(/^#{1,6}\s/gm,"").replace(/_{1,2}/g,"")
    .replace(/`{1,3}/g,"").trim()
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
    const url  = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/A:F?key=${SHEETS_KEY}`
    const res  = await fetch(url)
    const json = await res.json()
    const rows = json.values || []
    return rows.slice(1)
      .filter(row => row[5] && row[5].toLowerCase().includes("yes"))
      .map(row => ({ room:row[0]||"", name:row[1]||"", email:row[2]||"", phone:row[3]||"", city:row[4]||"" }))
      .filter(c => c.name)
  } catch(e) { return [] }
}

function getScheduleContext(events) {
  const now   = new Date()
  const today = now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",timeZone:"America/Los_Angeles"})
  let ctx = `Today is ${today} (Pacific Time).\n\nCOMPLETE RETREAT SCHEDULE:\n`
  let lastDay = ""
  events.forEach(ev => {
    const dayStr  = ev.dateObj.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",timeZone:"America/Los_Angeles"})
    const timeStr = ev.dateObj.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true,timeZone:"America/Los_Angeles"})
    if (dayStr !== lastDay) { ctx += `\n--- ${dayStr} ---\n`; lastDay = dayStr }
    ctx += `  ${timeStr} — ${ev.summary}`
    if (ev.desc) ctx += ` (${ev.desc.substring(0,120).replace(/\\n/g," ")})`
    ctx += "\n"
  })
  const next = events.filter(ev => ev.dateObj > now)[0]
  if (next) {
    const t = next.dateObj.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true,timeZone:"America/Los_Angeles"})
    const d = next.dateObj.toLocaleDateString("en-US",{weekday:"long",timeZone:"America/Los_Angeles"})
    ctx += `\nNEXT UPCOMING EVENT: ${next.summary} at ${t} PDT on ${d}.`
  }
  return ctx
}

function getContactsContext(contacts) {
  if (!contacts.length) return ""
  let ctx = "\n\nATTENDEE DIRECTORY:\n"
  contacts.forEach(c => {
    ctx += `\n${c.name}`
    if (c.room)  ctx += ` — Room ${c.room}`
    if (c.city)  ctx += ` — ${c.city}`
    if (c.email) ctx += ` — ${c.email}`
    if (c.phone) ctx += ` — ${c.phone}`
    ctx += "\n"
  })
  return ctx
}

function formatSchedule(events) {
  if (!events.length) return "No events found."
  const lines = ["Full Retreat Schedule","─".repeat(34)]
  let lastDay = ""
  events.forEach(ev => {
    const dayStr  = ev.dateObj.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"America/Los_Angeles"})
    const timeStr = ev.dateObj.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true,timeZone:"America/Los_Angeles"})
    if (dayStr !== lastDay) { if (lastDay) lines.push(""); lastDay = dayStr }
    lines.push(`${dayStr}  ·  ${timeStr} PDT  —  ${ev.summary}`)
  })
  lines.push(""); lines.push("Full app: https://mmr.beora.ai")
  return lines.join("\n")
}

async function askClaude(userMessage, context, extra) {
  const systemFull = SYSTEM + (context ? "\n\n" + context : "") + (extra ? "\n\n" + extra : "")
  const msg = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: systemFull,
    messages: [{ role:"user", content: userMessage }]
  })
  return stripMarkdown(msg.content[0].text)
}

async function getWeather() {
  try {
    const res  = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=36.9741&lon=-122.0308&units=imperial&appid=${WEATHER_KEY}`)
    const d    = await res.json()
    const days = {}
    ;(d.list||[]).forEach(item => {
      const label = new Date(item.dt*1000).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"America/Los_Angeles"})
      if (!days[label]) days[label] = {high:-999,low:999,desc:item.weather[0].description}
      days[label].high = Math.max(days[label].high, item.main.temp_max)
      days[label].low  = Math.min(days[label].low,  item.main.temp_min)
    })
    const lines = Object.entries(days).slice(0,4).map(([day,w]) =>
      `${day}: ${Math.round(w.high)}F / ${Math.round(w.low)}F — ${w.desc}`)
    return "Santa Cruz Forecast\n\n" + lines.join("\n")
  } catch(e) { return "Weather unavailable right now." }
}

// ── Commands ──────────────────────────────────────────────────────────────────
bot.command("start", ctx => {
  log("command","start")
  return ctx.reply(`Welcome to the Memorable Men's Retreat!\n\nI'm here to help during May 29-31 at Villa Maria Del Mar, Santa Cruz.\n\nCommands:\n/schedule — Full retreat schedule\n/step 1-12 — Any of the 12 Steps\n/weather — Santa Cruz forecast\n/venue — Venue info\n/aa — Local AA meetings\n/reflection — Daily reflection\n/directory — Attendee contacts\n/help — All commands\n\nOr ask me anything.`)
})

bot.command("help", ctx => {
  log("command","help")
  return ctx.reply(`Commands:\n\n/schedule — Full retreat schedule\n/step [1-12] — Sponsor-quality step explanation\n/weather — Santa Cruz forecast\n/venue — Venue info and address\n/aa — Local AA meetings\n/reflection — AA daily reflection\n/directory — Attendee contacts\n\nOr just ask me anything — schedule, AA questions, step work, finding a sponsor.`)
})

bot.command("venue", ctx => {
  log("command","venue")
  return ctx.reply(`Villa Maria Del Mar\n21918 E Cliff Dr, Santa Cruz, CA 95062\n\nFront desk: (831) 475-1236\n\nRooms:\n- Main Chapel — sessions and speakers\n- Fireside Room — small groups\n- Dining Hall — all meals\n- Garden — outdoor space\n\nHouse rule: Be respectful. This is a sober space.`)
})

bot.command("aa", ctx => {
  log("command","aa")
  return ctx.reply(`Local AA Meetings near the venue:\n\n7:00 AM daily — Serenity Group\n226 Cathcart St, Santa Cruz\n\n7:30 AM daily — Daily Reflections\n444 Encinal St, Santa Cruz\n\n12:00 PM daily — Santa Cruz Central\n1111 Soquel Ave, Santa Cruz\n\n7:00 PM daily — Evening Group\n226 Cathcart St, Santa Cruz\n\nVerify times at santa-cruz-aa.org`)
})

bot.command("schedule", async ctx => {
  log("command","schedule")
  await ctx.reply("Fetching schedule...")
  const events = await fetchSchedule()
  if (!events.length) return ctx.reply("Could not load schedule. Check https://mmr.beora.ai")
  await ctx.reply(formatSchedule(events))
})

bot.command("weather", async ctx => {
  log("command","weather")
  await ctx.reply("Checking the forecast...")
  await ctx.reply(await getWeather())
})

bot.command("directory", async ctx => {
  log("command","directory")
  await ctx.reply("Loading directory...")
  const contacts = await fetchContacts()
  if (!contacts.length) return ctx.reply("No contacts loaded yet.")
  const lines = ["Retreat Directory","─".repeat(30)]
  contacts.forEach(c => {
    lines.push("")
    lines.push(c.name + (c.room ? "  —  Room " + c.room : ""))
    if (c.city)  lines.push(c.city)
    if (c.email) lines.push(c.email)
    if (c.phone) lines.push(c.phone)
  })
  await ctx.reply(lines.join("\n"))
})

bot.command("step", async ctx => {
  const args = ctx.match?.trim()
  const num  = parseInt(args)
  if (!num || num < 1 || num > 12) {
    return ctx.reply("Please specify a step number 1-12.\nExample: /step 4")
  }
  log("aa_step", `step_${num}`)
  await ctx.reply(STEPS[num])
})

bot.command("reflection", async ctx => {
  log("command","reflection")
  await ctx.reply("Finding a reflection for you...")
  const text = await askClaude(
    "Write an AA daily reflection in the tradition of Just for Today. One central thought grounded in the Big Book or 12-step experience — something a sponsor with 20 years might share at the opening of a meeting. Then one sentence a person can carry through the day. Under 130 words. Warm, specific, plain text only. No generic wellness language.",
    null, null
  )
  await ctx.reply("Daily Reflection\n\n" + text)
})

// ── Message handler ───────────────────────────────────────────────────────────
bot.on("message:text", async ctx => {
  const text = ctx.message.text
  if (text.startsWith("/")) return

  const category    = classifyMessage(text)
  const haltSignal  = detectHALT(text)
  const milestone   = detectMilestone(text)

  log(category, haltSignal || (milestone ? "milestone" : ""))

  try {
    await ctx.reply("...")
    const [events, contacts] = await Promise.all([fetchSchedule(), fetchContacts()])
    const context = getScheduleContext(events) + getContactsContext(contacts)

    let extra = ""
    if (haltSignal) {
      extra = `HALT SIGNAL DETECTED: The user appears to be experiencing "${haltSignal}". Gently acknowledge this first — "That sounds like it might be hitting the HALT..." — before responding to any other content in their message.`
    }
    if (milestone) {
      extra = `MILESTONE DETECTED: The user is sharing a sobriety anniversary or milestone. Stop everything and honor this first. A short, warm, specific acknowledgment — as if you are the first person in the room to hear it. Then respond to anything else they asked.`
    }

    const reply = await askClaude(text, context, extra)
    await ctx.reply(reply)
  } catch(e) {
    await ctx.reply("Something went wrong. Try again or visit https://mmr.beora.ai")
  }
})

bot.catch(err => { console.error("Bot error:", err) })
bot.start()
console.log("Memorable Retreat bot running.")
