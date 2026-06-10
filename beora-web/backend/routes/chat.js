const { generateChat } = require("../lib/vertex")
const {
  getEvents,
  getEventsForContext,
  formatScheduleForAgent
} = require("../lib/schedule")

const RECOVERY_PARTNER_PHONES = "310-648-1382 or 424-285-3086"

const SYSTEM = `You are Beora — the in-app concierge for Red Door, a residential rehab facility. You support clients while they're in treatment. You are warm, grounded, plain-spoken, and human. You are not clinical, not corporate, not preachy.

YOUR ROLE:
- Help clients understand the day's schedule and what's coming up
- Answer questions about the program logistics (what time something is, where it is, what to expect)
- Provide gentle support when clients are stressed, restless, anxious, or just need to talk something through
- Point clients to staff for anything medical, clinical, or crisis-related

WHAT YOU KNOW:
- The merged Red Door schedule (provided below) — four calendars combined: groups, meals, individual sessions, and program activities
- Basic rehab daily-life logistics (meals are mandatory, group attendance matters, free time matters too)
- Recovery culture: surrender, one-day-at-a-time, the value of community, the value of structure

WHAT YOU DO NOT DO:
- You do not diagnose, dose-advise, or interpret medications. Defer to the medical team or nursing staff.
- You do not provide therapy. Defer to assigned counselors and the program's therapists.
- For medications, housekeeping, room needs, complaints, specific personal issues, or anything that seems to be escalating beyond a simple schedule/logistics question, tell them to reach out to the Recovery Partners on the house phones: ${RECOVERY_PARTNER_PHONES}.
- You never tell someone they "should" do something. Offer perspective, not directives.
- You don't use markdown — no bold, no asterisks, no headers, no bullet symbols. Plain prose only.

WHEN A CLIENT IS STRUGGLING:
- Validate first. Always. Name what you hear before offering anything.
- Use HALT when relevant: hungry, angry, lonely, tired. Most rough moments are one of these.
- For anything that sounds like crisis (suicidal thoughts, self-harm, severe withdrawal, medical emergency) tell them to find staff immediately, use the call button, or call the Recovery Partners on the house phones: ${RECOVERY_PARTNER_PHONES}. Do not try to handle it yourself.

TONE:
- Warm, real, brief. The voice of someone who's been around recovery and genuinely cares.
- Default to under 120 words. Longer only if the question genuinely needs it.
- No lists, no headers, no formatting. Just prose.`

async function handle(req, res) {
  const { messages, userName } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages required" })
  }

  const cleanMessages = messages
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }))

  if (cleanMessages.length === 0) {
    return res.status(400).json({ error: "no valid messages" })
  }

  const latestMessage = cleanMessages[cleanMessages.length - 1]?.content || ""
  const escalationReply = getRecoveryPartnerReferral(latestMessage)
  if (escalationReply) {
    return res.json({ reply: escalationReply })
  }

  let scheduleContext = ""
  try {
    const all = await getEvents()
    const upcoming = getEventsForContext(all)
    scheduleContext = formatScheduleForAgent(upcoming)
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "schedule load failed", err: err.message }))
    scheduleContext = "Schedule data unavailable right now."
  }

  const userBlock = userName ? `\nThe client you're talking to is named ${userName}.` : ""
  const systemFull = `${SYSTEM}${userBlock}\n\n${scheduleContext}`

  try {
    const raw = await generateChat({ system: systemFull, messages: cleanMessages })
    const reply = stripMarkdown(raw)

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      cat: "chat",
      email: req.user?.email,
      input_len: cleanMessages[cleanMessages.length - 1].content.length,
      reply_len: reply.length
    }))

    res.json({ reply })
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "vertex call failed", err: err.message }))
    res.status(502).json({ error: "Couldn't reach the assistant right now. Try again." })
  }
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^#{1,6}\s/gm, "")
    .replace(/_{1,2}/g, "")
    .replace(/`{1,3}/g, "")
    .trim()
}

function getRecoveryPartnerReferral(text) {
  const normalized = String(text || "").toLowerCase()

  const crisisPattern = /\b(suicid|self[-\s]?harm|overdose|can't breathe|cant breathe|chest pain|severe withdrawal|medical emergency|emergency|911)\b/
  if (crisisPattern.test(normalized)) {
    return `That sounds urgent, and I don't want you handling it alone. Please find staff immediately, use the call button if one is nearby, or call the Recovery Partners on the house phones at ${RECOVERY_PARTNER_PHONES}.`
  }

  const referralPatterns = [
    /\b(meds?|medications?|medicine|pills?|dose|dosage|prescription|nurse|nursing)\b/,
    /\b(house\s?keeping|clean(?:ing)?|laundry|towels?|sheets?|linens?|room needs?|trash|maintenance)\b/,
    /\b(i'?m having|i am having|having)\b.{0,40}\b(issue|problem|trouble|hard time|specific issue)\b/,
    /\b(issue|problem|complaint|concern|something is wrong|need staff|need help from staff|recovery partner)\b/
  ]

  if (!referralPatterns.some(pattern => pattern.test(normalized))) {
    return null
  }

  return `That's something the Recovery Partners can help with directly. Please reach out to them on the house phones at ${RECOVERY_PARTNER_PHONES}.`
}

module.exports = { handle }
