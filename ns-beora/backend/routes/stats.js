const { getUser, getLastEventOfType } = require("../lib/firestore")
const { computeStreak, computeDaysSinceStart, protocolDay } = require("../lib/coins")

const HEALTH_MILESTONES = [
  { hours:  8,  label: "Oxygen levels normalise" },
  { hours: 24,  label: "CO leaves your body" },
  { hours: 48,  label: "Taste and smell start returning" },
  { hours: 72,  label: "Nicotine-free — physical withdrawal complete" },
  { hours: 336, label: "Lung function improving (2 weeks)" },
  { hours: 720, label: "Circulation improving (1 month)" },
  { hours: 2160, label: "Coughing and shortness of breath reduce (3 months)" },
]

async function handle(req, res) {
  try {
    const user = await getUser(req.user.uid)
    if (!user) return res.status(404).json({ error: "User not found." })

    const { quitDate, onboardedAt, coins, streakFreezes, profile } = user
    const costPerDay = profile?.costPerDay || 0
    const perDay = profile?.perDay || 0

    const lastSmoke = await getLastEventOfType(req.user.uid, "smoke")
    const lastSmokeAt = lastSmoke ? lastSmoke.ts : user.lastSmokeAt

    const smokeFreeSince = lastSmokeAt || quitDate || onboardedAt
    const smokeFreeMsec = smokeFreeSince ? Date.now() - new Date(smokeFreeSince).getTime() : 0
    const smokeFreeHours = Math.max(0, smokeFreeMsec / (1000 * 60 * 60))
    const streakDays = computeStreak(lastSmokeAt, quitDate)

    const daysSinceStart = computeDaysSinceStart(onboardedAt, quitDate)
    const day = protocolDay(onboardedAt, quitDate)

    const moneySaved = costPerDay > 0
      ? +(costPerDay * (smokeFreeHours / 24)).toFixed(2)
      : null

    const unitsAvoided = perDay > 0
      ? Math.floor(perDay * (smokeFreeHours / 24))
      : null

    const nextMilestone = HEALTH_MILESTONES.find(m => m.hours > smokeFreeHours) || null

    const achievedMilestones = HEALTH_MILESTONES.filter(m => m.hours <= smokeFreeHours)

    res.json({
      smokeFreeSince,
      smokeFreeHours: Math.round(smokeFreeHours),
      streakDays,
      moneySaved,
      unitsAvoided,
      productType: profile?.productTypes?.[0] || "cigarettes",
      coins: coins || 0,
      streakFreezes: streakFreezes ?? 3,
      nextMilestone,
      achievedMilestones,
      daysSinceStart,
      protocolDay: day,
      awardedMilestoneDays: user.awardedMilestoneDays || []
    })
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "stats failed", err: err.message }))
    res.status(503).json({ error: "Couldn't load stats." })
  }
}

module.exports = { handle }
