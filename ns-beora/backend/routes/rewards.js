const { listRewards, createReward, deleteReward, redeemReward } = require("../lib/firestore")

async function list(req, res) {
  try {
    const rewards = await listRewards(req.user.uid)
    res.json({ rewards })
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "list rewards failed", err: err.message }))
    res.status(503).json({ error: "Couldn't load rewards." })
  }
}

async function create(req, res) {
  const { label, coinCost } = req.body || {}
  if (!label || typeof label !== "string" || !label.trim()) {
    return res.status(400).json({ error: "Label is required." })
  }
  const cost = parseInt(coinCost, 10)
  if (isNaN(cost) || cost < 1) {
    return res.status(400).json({ error: "coinCost must be a positive integer." })
  }
  try {
    const reward = await createReward(req.user.uid, { label: label.trim(), coinCost: cost })
    res.json({ reward })
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "create reward failed", err: err.message }))
    res.status(503).json({ error: "Couldn't create reward." })
  }
}

async function remove(req, res) {
  try {
    await deleteReward(req.user.uid, req.params.id)
    res.json({ ok: true })
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "delete reward failed", err: err.message }))
    res.status(503).json({ error: "Couldn't delete reward." })
  }
}

async function redeem(req, res) {
  try {
    const result = await redeemReward(req.user.uid, req.params.id)
    if (!result.ok) return res.status(400).json({ error: result.error })
    res.json({ ok: true, redemptionId: result.redemptionId })
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "redeem reward failed", err: err.message }))
    res.status(503).json({ error: "Couldn't redeem reward." })
  }
}

module.exports = { list, create, remove, redeem }
