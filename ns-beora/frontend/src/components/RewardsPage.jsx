import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "../utils/auth"

function formatDuration(hours) {
  if (hours < 1)    return "< 1 hour"
  if (hours < 24)   return `${hours}h`
  const days = Math.floor(hours / 24)
  const rem  = hours % 24
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function SnowflakeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 7l-5-5-5 5" />
      <path d="M17 17l-5 5-5-5" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M7 7l-5 5 5 5" />
      <path d="M17 7l5 5-5 5" />
    </svg>
  )
}

// ── Stats dashboard ───────────────────────────────────────────────────────────

function StatsDashboard({ stats }) {
  if (!stats) {
    return (
      <div className="rewards-stats-grid">
        {["smoke-free", "coins", "saved", "avoided"].map(k => (
          <div key={k} className="rewards-stat-card skeleton" />
        ))}
      </div>
    )
  }

  const { smokeFreeHours, streakDays, moneySaved, unitsAvoided, coins, productType } = stats

  const unitLabel = {
    cigarettes: "cigarettes",
    vape:       "puffs",
    pouches:    "pouches",
    dip:        "dips",
  }[productType] || "uses"

  return (
    <div className="rewards-stats-grid">
      <div className="rewards-stat-card">
        <div className="rewards-stat-value">{formatDuration(smokeFreeHours)}</div>
        <div className="rewards-stat-label">Smoke-free</div>
      </div>
      <div className="rewards-stat-card highlight">
        <div className="rewards-stat-value">{coins}</div>
        <div className="rewards-stat-label">Coins</div>
      </div>
      {moneySaved !== null && (
        <div className="rewards-stat-card">
          <div className="rewards-stat-value">${moneySaved.toFixed(2)}</div>
          <div className="rewards-stat-label">Saved</div>
        </div>
      )}
      {unitsAvoided !== null && (
        <div className="rewards-stat-card">
          <div className="rewards-stat-value">{unitsAvoided}</div>
          <div className="rewards-stat-label">{unitLabel} avoided</div>
        </div>
      )}
    </div>
  )
}

// ── Health milestones ─────────────────────────────────────────────────────────

function HealthTimeline({ stats }) {
  if (!stats) return null
  const { achievedMilestones, nextMilestone } = stats

  return (
    <div className="health-timeline">
      {achievedMilestones.map(m => (
        <div key={m.hours} className="health-milestone achieved">
          <span className="health-check">✓</span>
          <span>{m.label}</span>
        </div>
      ))}
      {nextMilestone && (
        <div className="health-milestone next">
          <span className="health-dot">○</span>
          <span>Next: {nextMilestone.label}</span>
        </div>
      )}
    </div>
  )
}

// ── Streak + freezes ──────────────────────────────────────────────────────────

function StreakCard({ stats, onUseFreeze }) {
  if (!stats) return null
  const { streakDays, streakFreezes } = stats

  return (
    <div className="streak-card">
      <div className="streak-left">
        <div className="streak-days">{streakDays}</div>
        <div className="streak-label">{streakDays === 1 ? "day" : "days"} smoke-free</div>
      </div>
      <div className="streak-freezes">
        {Array.from({ length: 3 }).map((_, i) => (
          <span key={i} className={"freeze-slot" + (i < streakFreezes ? " active" : "")}>
            <SnowflakeIcon />
          </span>
        ))}
        <div className="freeze-label">{streakFreezes} freeze{streakFreezes !== 1 ? "s" : ""} left</div>
      </div>
    </div>
  )
}

// ── User-defined rewards ──────────────────────────────────────────────────────

function RewardsList({ coins, rewards, onRedeem, onDelete, loading }) {
  const [label, setLabel]   = useState("")
  const [cost, setCost]     = useState("")
  const [adding, setAdding] = useState(false)
  const [addErr, setAddErr] = useState("")

  async function handleAdd(e) {
    e.preventDefault()
    const c = parseInt(cost, 10)
    if (!label.trim() || isNaN(c) || c < 1) {
      setAddErr("Enter a label and a coin cost (e.g. 50).")
      return
    }
    setAdding(true)
    setAddErr("")
    try {
      const res  = await apiFetch("/api/rewards", {
        method: "POST",
        body:   JSON.stringify({ label: label.trim(), coinCost: c })
      })
      const data = await res.json()
      if (!res.ok) {
        setAddErr(data.error || "Couldn't add reward.")
      } else {
        setLabel("")
        setCost("")
        onRedeem()  // triggers parent to reload rewards
      }
    } catch {
      setAddErr("Network error.")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="rewards-list-section">
      <div className="admin-section-label">My Rewards</div>

      <form className="reward-add-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="e.g. 30 min massage"
          value={label}
          onChange={e => setLabel(e.target.value)}
          disabled={adding}
        />
        <input
          type="number"
          placeholder="Coins"
          value={cost}
          min="1"
          onChange={e => setCost(e.target.value)}
          disabled={adding}
          className="reward-cost-input"
        />
        <button
          className="admin-add-btn reward-add-btn"
          type="submit"
          disabled={adding || !label.trim() || !cost}
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </form>
      {addErr && <div className="error-banner">{addErr}</div>}

      {loading && <div className="placeholder"><div className="spinner" /></div>}

      {!loading && rewards.length === 0 && (
        <div className="placeholder rewards-empty">
          <p>Add a reward above.</p>
          <p className="rewards-empty-hint">e.g. "50 coins = favourite dessert" or "200 coins = new book"</p>
        </div>
      )}

      {!loading && rewards.map(r => (
        <div key={r.id} className="reward-row">
          <div className="reward-info">
            <div className="reward-label">{r.label}</div>
            <div className="reward-cost">{r.coinCost} coins</div>
          </div>
          <div className="reward-actions">
            <button
              className="reward-redeem-btn"
              onClick={() => onRedeem(r)}
              disabled={coins < r.coinCost}
              title={coins < r.coinCost ? `Need ${r.coinCost - coins} more coins` : "Redeem"}
            >
              Redeem
            </button>
            <button
              className="admin-icon-btn danger"
              onClick={() => onDelete(r)}
              aria-label="Delete reward"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RewardsPage({ user }) {
  const [stats, setStats]     = useState(null)
  const [rewards, setRewards] = useState([])
  const [rLoading, setRL]     = useState(true)
  const [error, setError]     = useState("")
  const [toast, setToast]     = useState("")

  const loadStats = useCallback(async () => {
    try {
      const res  = await apiFetch("/api/stats")
      const data = await res.json()
      if (res.ok) setStats(data)
    } catch { /* non-fatal */ }
  }, [])

  const loadRewards = useCallback(async () => {
    setRL(true)
    try {
      const res  = await apiFetch("/api/rewards")
      const data = await res.json()
      if (res.ok) setRewards(data.rewards || [])
    } catch { /* non-fatal */ } finally {
      setRL(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
    loadRewards()
  }, [loadStats, loadRewards])

  // Refresh stats every 60s while the tab is open
  useEffect(() => {
    const t = setInterval(loadStats, 60_000)
    return () => clearInterval(t)
  }, [loadStats])

  async function handleRedeem(reward) {
    if (!reward) {
      loadRewards()
      return
    }
    if (!confirm(`Redeem "${reward.label}" for ${reward.coinCost} coins?`)) return
    try {
      const res  = await apiFetch(`/api/rewards/${reward.id}/redeem`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Couldn't redeem.")
        return
      }
      setToast(`Redeemed: ${reward.label}`)
      setTimeout(() => setToast(""), 3000)
      loadStats()
    } catch {
      setError("Network error.")
    }
  }

  async function handleDelete(reward) {
    if (!confirm(`Delete "${reward.label}"?`)) return
    try {
      await apiFetch(`/api/rewards/${reward.id}`, { method: "DELETE" })
      loadRewards()
    } catch { /* non-fatal */ }
  }

  const onboarded = user?.onboarded === true

  if (!onboarded) {
    return (
      <div className="page">
        <div className="placeholder">
          <p>Complete onboarding with Beora on the Coach tab first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page rewards-page">
      {toast && <div className="celebration-toast" onClick={() => setToast("")}>{toast}</div>}
      {error && <div className="error-banner" onClick={() => setError("")}>{error}</div>}

      <div className="admin-section-label" style={{ marginTop: "var(--space-5)" }}>Progress</div>
      <StatsDashboard stats={stats} />

      <StreakCard stats={stats} />

      <HealthTimeline stats={stats} />

      <RewardsList
        coins={stats?.coins ?? 0}
        rewards={rewards}
        loading={rLoading}
        onRedeem={handleRedeem}
        onDelete={handleDelete}
      />
    </div>
  )
}
