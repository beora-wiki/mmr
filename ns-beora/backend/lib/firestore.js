const { Firestore, FieldValue } = require("@google-cloud/firestore")

let _db = null

function db() {
  if (!_db) {
    _db = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "beora-492609"
    })
  }
  return _db
}

const USERS = "ns_users"

// ── User doc ─────────────────────────────────────────────────────────────────

async function getUser(uid) {
  const doc = await db().collection(USERS).doc(uid).get()
  return doc.exists ? { uid, ...doc.data() } : null
}

async function upsertUser(uid, { displayName, email, tz }) {
  const ref = db().collection(USERS).doc(uid)
  const snap = await ref.get()
  if (!snap.exists) {
    await ref.set({
      displayName,
      email,
      tz: tz || "UTC",
      createdAt: new Date().toISOString(),
      onboarded: false,
      coins: 0,
      streakFreezes: 3,
      lastSmokeAt: null,
      quitDate: null,
      onboardedAt: null,
      profile: {}
    })
  }
  return getUser(uid)
}

async function updateUserProfile(uid, profilePatch, extra = {}) {
  const ref = db().collection(USERS).doc(uid)
  const patch = {}
  for (const [k, v] of Object.entries(profilePatch)) {
    patch[`profile.${k}`] = v
  }
  await ref.set({ ...patch, ...extra }, { merge: true })
  return getUser(uid)
}

async function markOnboarded(uid, quitDate) {
  const ref = db().collection(USERS).doc(uid)
  await ref.set({
    onboarded: true,
    onboardedAt: new Date().toISOString(),
    quitDate: quitDate || new Date().toISOString()
  }, { merge: true })
}

// ── Events ────────────────────────────────────────────────────────────────────

async function logEvent(uid, { type, trigger, note }) {
  const ts = new Date().toISOString()
  const ref = db().collection(USERS).doc(uid).collection("events").doc()
  await ref.set({ type, trigger: trigger || null, note: note || null, ts })
  return { id: ref.id, type, ts }
}

async function getEventsToday(uid, tz) {
  const now = new Date()
  const dayStart = getStartOfDayUTC(now, tz)
  const snap = await db().collection(USERS).doc(uid).collection("events")
    .where("ts", ">=", dayStart.toISOString())
    .get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function getLastEventOfType(uid, type) {
  const snap = await db().collection(USERS).doc(uid).collection("events")
    .where("type", "==", type)
    .orderBy("ts", "desc")
    .limit(1)
    .get()
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() }
}

// ── Coins & streak ────────────────────────────────────────────────────────────

async function addCoins(uid, amount) {
  const ref = db().collection(USERS).doc(uid)
  await ref.set({ coins: FieldValue.increment(amount) }, { merge: true })
}

async function deductCoins(uid, amount) {
  const ref = db().collection(USERS).doc(uid)
  const snap = await ref.get()
  const current = snap.data()?.coins || 0
  if (current < amount) return false
  await ref.set({ coins: FieldValue.increment(-amount) }, { merge: true })
  return true
}

async function recordSmoke(uid) {
  const ref = db().collection(USERS).doc(uid)
  await ref.set({ lastSmokeAt: new Date().toISOString() }, { merge: true })
}

async function useStreakFreeze(uid) {
  const ref = db().collection(USERS).doc(uid)
  const snap = await ref.get()
  const freezes = snap.data()?.streakFreezes || 0
  if (freezes <= 0) return false
  await ref.set({ streakFreezes: FieldValue.increment(-1) }, { merge: true })
  return true
}

// ── Rewards ───────────────────────────────────────────────────────────────────

async function listRewards(uid) {
  const snap = await db().collection(USERS).doc(uid).collection("rewards").get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
}

async function createReward(uid, { label, coinCost }) {
  const ref = db().collection(USERS).doc(uid).collection("rewards").doc()
  const data = { label, coinCost, createdAt: new Date().toISOString() }
  await ref.set(data)
  return { id: ref.id, ...data }
}

async function deleteReward(uid, rewardId) {
  await db().collection(USERS).doc(uid).collection("rewards").doc(rewardId).delete()
}

async function redeemReward(uid, rewardId) {
  const rewardRef = db().collection(USERS).doc(uid).collection("rewards").doc(rewardId)
  const rewardSnap = await rewardRef.get()
  if (!rewardSnap.exists) return { ok: false, error: "Reward not found." }

  const { label, coinCost } = rewardSnap.data()
  const deducted = await deductCoins(uid, coinCost)
  if (!deducted) return { ok: false, error: "Not enough coins." }

  const redemptionRef = db().collection(USERS).doc(uid).collection("redemptions").doc()
  await redemptionRef.set({ rewardId, label, coinCost, ts: new Date().toISOString() })
  return { ok: true, redemptionId: redemptionRef.id }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStartOfDayUTC(date, tz) {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit"
    })
    const local = formatter.format(date)
    return new Date(`${local}T00:00:00`)
  } catch {
    const d = new Date(date)
    d.setUTCHours(0, 0, 0, 0)
    return d
  }
}

module.exports = {
  getUser,
  upsertUser,
  updateUserProfile,
  markOnboarded,
  logEvent,
  getEventsToday,
  getLastEventOfType,
  addCoins,
  deductCoins,
  recordSmoke,
  useStreakFreeze,
  listRewards,
  createReward,
  deleteReward,
  redeemReward,
  getStartOfDayUTC
}
