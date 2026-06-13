const { generateChat } = require("../lib/vertex")
const {
  getUser,
  upsertUser,
  updateUserProfile,
  markOnboarded
} = require("../lib/firestore")
const { protocolDay } = require("../lib/coins")

// ── Onboarding tool ───────────────────────────────────────────────────────────

const UPDATE_PROFILE_TOOL = {
  name: "update_profile",
  description: "Save what you've learned about the user to their profile. Call this incrementally as you collect each piece of info. Once you have all the core answers, call it once more with onboarded: true to mark onboarding complete.",
  parameters: {
    type: "object",
    properties: {
      productTypes:    { type: "array", items: { type: "string" }, description: "Nicotine products used, e.g. ['cigarettes','vape','pouches']" },
      perDay:          { type: "number", description: "Units per day (cigarettes, puffs, pouches)" },
      nicotineAmount:  { type: "string", description: "Nicotine strength e.g. '6mg', '50mg pouch'" },
      hsi_timeToFirst: { type: "string", description: "How soon after waking: '<5min','6-30min','31-60min','>60min'" },
      triggers:        { type: "array", items: { type: "string" }, description: "Trigger situations e.g. ['stress','after meals','boredom']" },
      priorAttempts:   { type: "number", description: "Number of prior quit attempts" },
      motivations:     { type: "array", items: { type: "string" }, description: "Motivations to quit e.g. ['health','family','money']" },
      quitStyle:       { type: "string", description: "cold-turkey | gradual | tracking-only" },
      identityStatement: { type: "string", description: "Who they want to become, e.g. 'someone who is free from nicotine'" },
      values:          { type: "array", items: { type: "string" }, description: "Core values e.g. ['family','freedom','health']" },
      tonePref:        { type: "string", description: "cheerleader | drill-sergeant | calm-friend | just-facts" },
      humorOk:         { type: "boolean", description: "Whether light humor is welcome" },
      selfKindnessProxy: { type: "string", description: "How they treat themselves after setbacks: kind | neutral | harsh" },
      hobbies:         { type: "array", items: { type: "string" }, description: "Hobbies and interests" },
      costPerDay:      { type: "number", description: "Estimated daily spend on nicotine in USD" },
      onboarded:       { type: "boolean", description: "Set to true only when all core questions are answered" }
    },
    required: []
  }
}

const ONBOARDING_SYSTEM = `You are Beora — a warm, slightly playful quit coach helping someone stop using nicotine. You're meeting them for the first time.

YOUR JOB RIGHT NOW:
Collect their nicotine profile and a little about who they are as a person, so you can personalize their quit journey. Do this through natural conversation — not a clipboard interrogation. Be warm, curious, and real. A little humor is welcome. Keep each message short (2–3 sentences max).

QUESTIONS TO COVER (in a natural order, not necessarily this order):
1. What nicotine products do they use? (cigarettes, vape, pouches, dip, cigars — can be more than one)
2. How much per day? (cigarettes/day, puffs, pouches)
3. How soon after waking do they have their first one? (this reveals dependence level)
4. What are their main triggers? (stress, coffee, after meals, driving, boredom, social)
5. Motivation — why do they want to quit? What would their life look like free of this?
6. Have they tried to quit before? What happened?
7. Do they want to go cold turkey, cut down gradually, or just start tracking for now?
8. Who do they want to become through this? (seeds their identity statement)
9. Hobbies and things they love — this helps with replacement suggestions and temptation bundling
10. How should you talk to them? (cheerleader energy, straight facts, gentle friend, tough love)
11. Roughly how much do they spend on nicotine per day? (unlocks the money-saved tracker)

After you have the core answers (at minimum: products, amount, triggers, motivation, quit style), call update_profile with those fields. Then ask one or two lighter rapport questions, save those, and call update_profile one final time with onboarded: true.

NEVER say "I've saved your profile" or mention the tool call. Just continue the conversation naturally. When onboarding is complete, close with a warm, brief statement about what's coming next — the pre-use protocol — and invite their first question.

TONE: Warm, real, lightly funny. This is a person starting something hard and brave. Honor that.`

// ── Post-onboarding coach system ──────────────────────────────────────────────

function buildCoachSystem(user, day) {
  const p = user.profile || {}
  const name = user.displayName || "friend"
  const products = (p.productTypes || ["nicotine"]).join("/")
  const perDay = p.perDay || null
  const triggers = (p.triggers || []).join(", ") || "unknown"
  const motivations = (p.motivations || []).join(", ") || "their health"
  const identity = p.identityStatement || "someone free from nicotine"
  const values = (p.values || []).join(", ") || "health and freedom"
  const tonePref = p.tonePref || "calm-friend"
  const humorOk = p.humorOk !== false
  const selfKind = p.selfKindnessProxy || "neutral"
  const costPerDay = p.costPerDay || null

  const toneNote = {
    "cheerleader":    "Be enthusiastic and encouraging. Celebrate every win loudly.",
    "drill-sergeant": "Be direct, no-nonsense. Push them. They asked for it.",
    "calm-friend":    "Be warm and steady. A grounded presence, not hyper.",
    "just-facts":     "Keep it practical. Facts, options, next steps. Skip the feelings talk."
  }[tonePref] || "Be warm and steady."

  const humorNote = humorOk
    ? "Light humor is welcome — but aim it at cigarettes/nicotine, never at them."
    : "Skip humor. Keep it warm and direct."

  const affirmationNote = selfKind === "harsh"
    ? "For affirmations: use fact-based reflection only ('You've resisted 3 cravings today') — avoid global praise ('You're so strong') which can backfire."
    : "Affirmations should be value- and evidence-linked ('Three cravings resisted. That's what someone living for their family looks like.')."

  const dayScripts = {
    1: `TODAY IS DAY 1.
When they say they're about to use or are having a craving, run Rocky's pre-use protocol:
Step 1 — Have them say (out loud or in their mind): "I am nicotine addicted. I want to use. I can use. I do not have to stop. But I want: ${motivations}. Freedom. A huge accomplishment."
Step 2 — Acknowledge the urge without judgment. Urges peak in 1–5 minutes and pass. They don't have to fight it — just ride it.
Step 3 — Offer their choice: "Resisted" or "I used" — both are honest and both are data.`,

    2: `TODAY IS DAY 2.
Continue the Day 1 pre-use protocol. Additionally: the urge is just a feeling. Invite them to sit with it deliberately — close their eyes and feel the urge, knowing it will pass. This is urge surfing. The goal is to see the urge for what it is: a wave, not a command.
Day 2 note: ideally they'd practice calling up the urge on purpose every 30 minutes, but in this version they come to you when ready.`,

    3: `TODAY IS DAY 3.
Continue the pre-use protocol. Add the math: they are now ${perDay ? `${perDay} ${products}/day` : "a regular user"}, which means roughly ${perDay ? Math.round(perDay * 365) : "thousands"} units per year. The only thing that puts them back is the next hit — not the situation, not the person, not the stress. The situation is just the cue. They're changing the routine.
Physical nicotine withdrawal is essentially complete by 72 hours — what's left is habit and association.`,

    4: `TODAY IS DAY 4 AND BEYOND.
Continue with the pre-use protocol when needed. Focus on relapse prevention: urges will come in waves — some predictable, some out of nowhere — and they never fully stop at first. That's normal. The late urge (weeks, months later) is where many people slip. They're not weak; the cue just fired. The response is the same: pause, affirm, ride it out, choose.
Celebrate milestones. Track their progress. Remind them what's at stake.`
  }

  const scriptNote = dayScripts[Math.min(day, 4)]

  return `You are Beora — a quit coach for ${name}, who is quitting ${products}.

THEIR PROFILE:
- Products: ${products}${perDay ? `, ${perDay}/day` : ""}
- Triggers: ${triggers}
- Motivations: ${motivations}
- Identity goal: "${identity}"
- Values: ${values}
${costPerDay ? `- Daily spend: ~$${costPerDay}/day` : ""}

YOUR ROLE:
- Coach them through Rocky's pre-use protocol when they're about to use or are craving.
- Provide support, encouragement, and relapse-prevention framing between uses.
- Help them understand their own patterns, urges, and wins.
- Celebrate smoke-free milestones.

WHAT YOU DO NOT DO:
- Do not diagnose or advise on medications.
- Do not provide therapy or clinical treatment.
- No markdown formatting — plain prose only.
- Never tell them they "should" do something. Offer perspective, not directives.

${scriptNote}

TONE: ${toneNote}
${humorNote}
${affirmationNote}
Identity tracking: watch for the language shift from "trying to quit" to "I don't smoke." Reflect it back when you hear it — that shift matters.
Default to under 100 words. Longer only if the moment genuinely needs it.`
}

// ── Crisis detection ──────────────────────────────────────────────────────────

const CRISIS_PATTERN = /\b(suicid|self[-\s]?harm|overdose|can't breathe|cant breathe|chest pain|severe withdrawal|medical emergency|911|kill myself|end it all|hurt myself)\b/i

function getCrisisReply(text) {
  if (CRISIS_PATTERN.test(text)) {
    return "That sounds serious, and I want you to get real support right now. Please reach out to the 988 Suicide and Crisis Lifeline — call or text 988. If this is a medical emergency, call 911. You don't have to handle this alone."
  }
  return null
}

// ── Tone state: detect distress/slip for humor suppression ───────────────────

function isDistressOrSlip(text, messageType) {
  if (messageType === "slip") return true
  const t = String(text || "").toLowerCase()
  return /\b(failed|relapsed|gave in|smoked|used|slipped|ashamed|terrible|awful|hopeless|can't do this|giving up|i quit|so hard|struggling)\b/.test(t)
}

// ── Route handler ─────────────────────────────────────────────────────────────

async function handle(req, res) {
  const { messages, messageType } = req.body || {}

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

  const latestContent = cleanMessages[cleanMessages.length - 1]?.content || ""

  // Crisis check — deterministic, bypasses LLM
  const crisisReply = getCrisisReply(latestContent)
  if (crisisReply) {
    return res.json({ reply: crisisReply, crisis: true })
  }

  let user = await getUser(req.user.uid)
  if (!user) {
    user = await upsertUser(req.user.uid, {
      displayName: req.user.name || req.user.email,
      email: req.user.email
    })
  }

  const onboarded = user?.onboarded === true

  // Onboarding flow — uses function-calling to persist profile fields
  if (!onboarded) {
    return handleOnboarding(req, res, user, cleanMessages)
  }

  // Post-onboarding coach
  const day = protocolDay(user.onboardedAt, user.quitDate)
  const p = user.profile || {}
  const isSuppressHumor = p.humorOk === false || isDistressOrSlip(latestContent, messageType)

  const system = buildCoachSystem(user, day)
  const systemWithTone = isSuppressHumor
    ? system + "\n\nTONE OVERRIDE: Humor suppressed for this message. Be calm, validating, and grounded only."
    : system

  try {
    const { text } = await generateChat({ system: systemWithTone, messages: cleanMessages })

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      cat: "chat",
      uid: req.user.uid,
      day,
      onboarded,
      input_len: latestContent.length,
      reply_len: text.length
    }))

    res.json({ reply: text })
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "vertex call failed", err: err.message }))
    res.status(502).json({ error: "Couldn't reach the coach right now. Try again." })
  }
}

async function handleOnboarding(req, res, user, cleanMessages) {
  let profileUpdated = false
  let shouldMarkOnboarded = false
  let quitDateFromTool = null

  async function toolHandler(name, args) {
    if (name !== "update_profile") return { ok: false }

    const { onboarded, ...profileFields } = args

    if (Object.keys(profileFields).length > 0) {
      await updateUserProfile(req.user.uid, profileFields)
      profileUpdated = true
    }

    if (onboarded === true) {
      shouldMarkOnboarded = true
    }

    return { ok: true, saved: Object.keys(profileFields) }
  }

  try {
    const { text, calledTool } = await generateChat({
      system:      ONBOARDING_SYSTEM,
      messages:    cleanMessages,
      tools:       [UPDATE_PROFILE_TOOL],
      toolHandler
    })

    if (shouldMarkOnboarded) {
      await markOnboarded(req.user.uid, quitDateFromTool)
    }

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      cat: "onboarding",
      uid: req.user.uid,
      calledTool,
      profileUpdated,
      markedOnboarded: shouldMarkOnboarded
    }))

    res.json({ reply: text, onboarded: shouldMarkOnboarded })
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "onboarding chat failed", err: err.message }))
    res.status(502).json({ error: "Couldn't reach the coach right now. Try again." })
  }
}

module.exports = { handle }
