const { getUser, upsertUser, updateUserProfile, markOnboarded } = require("../lib/firestore")

async function getProfile(req, res) {
  try {
    const user = await getUser(req.user.uid)
    if (!user) {
      const created = await upsertUser(req.user.uid, {
        displayName: req.user.name || req.user.email,
        email: req.user.email,
        tz: req.body?.tz
      })
      return res.json({ user: created })
    }
    res.json({ user })
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "get profile failed", err: err.message }))
    res.status(503).json({ error: "Couldn't load profile." })
  }
}

async function postProfile(req, res) {
  const { profile, tz, quitDate, onboarded } = req.body || {}
  try {
    let user = await getUser(req.user.uid)
    if (!user) {
      user = await upsertUser(req.user.uid, {
        displayName: req.user.name || req.user.email,
        email: req.user.email,
        tz
      })
    }

    if (tz) {
      const { Firestore } = require("@google-cloud/firestore")
      const db = new Firestore({ projectId: process.env.GOOGLE_CLOUD_PROJECT || "beora-492609" })
      await db.collection("ns_users").doc(req.user.uid).set({ tz }, { merge: true })
    }

    if (profile && typeof profile === "object") {
      await updateUserProfile(req.user.uid, profile)
    }

    if (onboarded === true) {
      await markOnboarded(req.user.uid, quitDate)
    }

    const updated = await getUser(req.user.uid)
    res.json({ user: updated })
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "post profile failed", err: err.message }))
    res.status(503).json({ error: "Couldn't save profile." })
  }
}

module.exports = { getProfile, postProfile }
