/**
 * Server-side coin awards, streak management, and anti-gaming logic.
 *
 * Design principles (from brain doc):
 * - Reward verified healthy actions, not app-opening.
 * - Variable/intermittent bonus on top of guaranteed base (keeps dopamine pairing alive).
 * - Taper multiplier — reduce coin density as abstinence lengthens.
 * - Daily caps to deter button-mashing.
 * - All "verification" is self-report; coins stay virtual.
 */

const BASE_COINS = {
  preuse_statement: 5,   // completed Rocky's pre-use affirmation flow
  resisted:         10,  // logged "resisted" (survived a craving without using)
  checkin:           3,  // daily check-in
}

const MILESTONE_COINS = [
  { days: 1,   coins: 25,  label: "First smoke-free day" },
  { days: 3,   coins: 50,  label: "Three smoke-free days" },
  { days: 7,   coins: 100, label: "One week smoke-free" },
  { days: 14,  coins: 150, label: "Two weeks smoke-free" },
  { days: 30,  coins: 250, label: "One month smoke-free" },
  { days: 60,  coins: 400, label: "Two months smoke-free" },
  { days: 90,  coins: 500, label: "Three months smoke-free" },
]

const DAILY_CAPS = {
  preuse_statement: 3,
  resisted:         5,
  checkin:          1,
}

// Taper: full coins in week 1, reducing as abstinence builds
function taperMultiplier(daysSinceStart) {
  if (daysSinceStart < 7)   return 1.0
  if (daysSinceStart < 30)  return 0.8
  return 0.6
}

// Variable/intermittent bonus: ~25% chance of a surprise bonus
function surpriseBonus(actionType) {
  if (actionType !== "preuse_statement" && actionType !== "resisted") return 0
  if (Math.random() < 0.25) {
    return Math.floor(Math.random() * 11) + 5  // 5–15 bonus coins
  }
  return 0
}

function computeCoinsForAction(actionType, todayCount, daysSinceStart) {
  const base = BASE_COINS[actionType]
  if (!base) return { coins: 0, bonus: 0, surprise: false }

  const cap = DAILY_CAPS[actionType] || 1
  if (todayCount >= cap) return { coins: 0, bonus: 0, surprise: false }

  const taper = taperMultiplier(daysSinceStart)
  const earned = Math.floor(base * taper)
  const bonus = surpriseBonus(actionType)

  return { coins: earned, bonus, surprise: bonus > 0 }
}

function checkMilestones(daysSinceSmokeFree, awardedMilestoneDays = []) {
  const pending = []
  for (const m of MILESTONE_COINS) {
    if (daysSinceSmokeFree >= m.days && !awardedMilestoneDays.includes(m.days)) {
      pending.push(m)
    }
  }
  return pending
}

function computeStreak(lastSmokeAt, quitDate) {
  const base = lastSmokeAt || quitDate
  if (!base) return 0
  const ms = Date.now() - new Date(base).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function computeDaysSinceStart(onboardedAt, quitDate) {
  const base = quitDate || onboardedAt
  if (!base) return 0
  const ms = Date.now() - new Date(base).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

// Protocol day (Day 1–4+ determines which Rocky script to run)
function protocolDay(onboardedAt, quitDate) {
  const days = computeDaysSinceStart(onboardedAt, quitDate)
  if (days === 0) return 1
  if (days === 1) return 2
  if (days === 2) return 3
  return 4
}

module.exports = {
  computeCoinsForAction,
  checkMilestones,
  computeStreak,
  computeDaysSinceStart,
  protocolDay,
  MILESTONE_COINS,
  DAILY_CAPS,
}
