const {
  getUser,
  logEvent,
  getEventsToday,
  getLastEventOfType,
  addCoins,
  recordSmoke,
  useStreakFreeze
} = require("../lib/firestore")

const {
  computeCoinsForAction,
  checkMilestones,
  computeDaysSinceStart,
  computeStreak
} = require("../lib/coins")

const VALID_TYPES = ["smoke", "craving", "resisted", "checkin", "preuse_statement"]

async function handle(req, res) {
  const { type, trigger, note, useFreeze } = req.body || {}

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Use: ${VALID_TYPES.join(", ")}` })
  }

  try {
    const user = await getUser(req.user.uid)
    if (!user) return res.status(404).json({ error: "User not found." })

    const tz = user.tz || "UTC"
    const onboardedAt = user.onboardedAt
    const quitDate = user.quitDate
    const daysSinceStart = computeDaysSinceStart(onboardedAt, quitDate)

    await logEvent(req.user.uid, { type, trigger, note })

    let coinsEarned = 0
    let bonus = 0
    let surprise = false
    let milestones = []
    let streakReset = false

    if (type === "smoke") {
      if (useFreeze) {
        const used = await useStreakFreeze(req.user.uid)
        if (!used) {
          await recordSmoke(req.user.uid)
          streakReset = true
        }
      } else {
        await recordSmoke(req.user.uid)
        streakReset = true
      }
    } else if (type === "preuse_statement" || type === "resisted" || type === "checkin") {
      const todayEvents = await getEventsToday(req.user.uid, tz)
      const todayCount = todayEvents.filter(e => e.type === type).length - 1  // exclude just-logged

      const result = computeCoinsForAction(type, todayCount, daysSinceStart)
      coinsEarned = result.coins
      bonus = result.bonus
      surprise = result.surprise

      if (coinsEarned + bonus > 0) {
        await addCoins(req.user.uid, coinsEarned + bonus)
      }

      // Check for smoke-free milestones
      const lastSmoke = await getLastEventOfType(req.user.uid, "smoke")
      const lastSmokeAt = lastSmoke ? lastSmoke.ts : user.lastSmokeAt
      const streakDays = computeStreak(lastSmokeAt, quitDate)

      const awardedDays = (user.awardedMilestoneDays || [])
      const pendingMilestones = checkMilestones(streakDays, awardedDays)

      for (const m of pendingMilestones) {
        await addCoins(req.user.uid, m.coins)
        coinsEarned += m.coins
        milestones.push(m)
      }

      if (pendingMilestones.length > 0) {
        const { Firestore } = require("@google-cloud/firestore")
        const db = new Firestore({ projectId: process.env.GOOGLE_CLOUD_PROJECT || "beora-492609" })
        const newDays = [...awardedDays, ...pendingMilestones.map(m => m.days)]
        await db.collection("ns_users").doc(req.user.uid).set(
          { awardedMilestoneDays: newDays },
          { merge: true }
        )
      }
    }

    const updatedUser = await getUser(req.user.uid)

    res.json({
      ok: true,
      type,
      coinsEarned,
      bonus,
      surprise,
      milestones,
      streakReset,
      coins: updatedUser.coins || 0
    })
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "log event failed", err: err.message }))
    res.status(503).json({ error: "Couldn't log event." })
  }
}

module.exports = { handle }
