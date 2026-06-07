const { getEvents } = require("../lib/schedule")

async function handle(_req, res) {
  try {
    const events = await getEvents()
    res.json({ events })
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), msg: "schedule fetch failed", err: err.message }))
    res.status(503).json({ error: "Couldn't load the schedule right now." })
  }
}

module.exports = { handle }
