import { useState, useRef, useEffect } from "react"
import { apiFetch } from "../utils/auth"
import ParrotMascot from "./ParrotMascot"

const GREETING_ONBOARDING = "Hey, I'm Beora — your quit coach. Before we dive in, I'd love to learn a bit about you and your relationship with nicotine, so I can actually be useful instead of generic. Mind if I ask you a few questions?"

const GREETING_COACH = "Hey, I'm here. You can talk through anything — cravings, the hard moments, the wins. Or tap the urge button anytime you need the pre-use flow."

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-2-1-4-2-5 0 2-1 3-2 3-1 0-2-1-2-3 0-1.5 1-4 1-4z" />
    </svg>
  )
}

// Urge flow — runs the pre-use protocol inline
function UrgeModal({ onResult, onClose }) {
  const [step, setStep]         = useState("breathe")  // breathe | outcome
  const [breathCount, setBc]    = useState(0)
  const [saving, setSaving]     = useState(false)

  function nextBreath() {
    const next = breathCount + 1
    setBc(next)
    if (next >= 3) setStep("outcome")
  }

  async function logOutcome(type) {
    setSaving(true)
    try {
      await apiFetch("/api/log", {
        method: "POST",
        body: JSON.stringify({ type, trigger: "urge_flow" })
      })
    } catch { /* non-fatal */ }
    onResult(type)
  }

  if (step === "breathe") {
    return (
      <div className="urge-overlay">
        <div className="urge-modal">
          <div className="urge-title">Urge surfing</div>
          <p className="urge-body">
            An urge is just a feeling — it peaks and passes in 1–5 minutes. Let's ride it out together.
          </p>
          <div className="urge-affirmation">
            "I am nicotine addicted. I want to use. I can use. I do not have to stop. But I want better health, freedom, and a huge accomplishment."
          </div>
          <p className="urge-body urge-breathe-cue">
            {breathCount === 0 && "Take one slow breath in, then out. Tap when done."}
            {breathCount === 1 && "One more. In… and out."}
            {breathCount === 2 && "Last one. In… and out."}
          </p>
          <button className="urge-breath-btn" onClick={nextBreath} disabled={saving}>
            {breathCount === 0 ? "I breathed" : breathCount === 1 ? "Second breath" : "Third breath"}
          </button>
          <button className="urge-skip" onClick={() => setStep("outcome")}>Skip to outcome</button>
        </div>
      </div>
    )
  }

  return (
    <div className="urge-overlay">
      <div className="urge-modal">
        <div className="urge-title">How did it go?</div>
        <p className="urge-body">Both answers are honest. Both are data, not failure.</p>
        <div className="urge-outcome-btns">
          <button
            className="urge-outcome-btn resisted"
            onClick={() => logOutcome("resisted")}
            disabled={saving}
          >
            I resisted
          </button>
          <button
            className="urge-outcome-btn smoked"
            onClick={() => logOutcome("smoke")}
            disabled={saving}
          >
            I used
          </button>
        </div>
        <button className="urge-skip" onClick={onClose} disabled={saving}>Cancel</button>
      </div>
    </div>
  )
}

// Coin/milestone celebration toast
function CelebrationToast({ result, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  if (!result) return null
  const total = result.coinsEarned + (result.bonus || 0)
  if (total <= 0 && !result.milestones?.length) return null

  return (
    <div className="celebration-toast" onClick={onDismiss}>
      {result.surprise && <div className="celebration-surprise">Surprise bonus!</div>}
      {total > 0 && <div className="celebration-coins">+{total} coins</div>}
      {result.milestones?.map(m => (
        <div key={m.days} className="celebration-milestone">{m.label}</div>
      ))}
    </div>
  )
}

export default function CoachPage({ user, onProfileUpdate }) {
  const onboarded  = user?.onboarded === true
  const [messages, setMessages] = useState([
    { role: "assistant", content: onboarded ? GREETING_COACH : GREETING_ONBOARDING }
  ])
  const [input, setInput]             = useState("")
  const [sending, setSending]         = useState(false)
  const [error, setError]             = useState("")
  const [showUrge, setShowUrge]       = useState(false)
  const [celebResult, setCelebResult] = useState(null)
  const scrollRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, sending])

  // Re-set greeting if onboarded status changes (e.g. onboarding just completed)
  const prevOnboarded = useRef(onboarded)
  useEffect(() => {
    if (!prevOnboarded.current && onboarded) {
      prevOnboarded.current = true
    }
  }, [onboarded])

  async function send() {
    const text = input.trim()
    if (!text || sending) return

    setError("")
    const next = [...messages, { role: "user", content: text }]
    setMessages(next)
    setInput("")
    setSending(true)

    try {
      const res  = await apiFetch("/api/chat", {
        method: "POST",
        body:   JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content }))
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong.")
        setSending(false)
        return
      }

      setMessages(curr => [...curr, { role: "assistant", content: data.reply }])

      // If onboarding just completed, refresh user profile
      if (data.onboarded && onProfileUpdate) {
        try {
          const profileRes  = await apiFetch("/api/profile")
          const profileData = await profileRes.json()
          onProfileUpdate(profileData.user)
        } catch { /* non-fatal */ }
      }
    } catch {
      setError("Couldn't reach Beora. Check your connection.")
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function handleUrgeResult(type) {
    setShowUrge(false)

    // Log the pre-use statement completion separately (earns coins)
    try {
      const res  = await apiFetch("/api/log", {
        method: "POST",
        body:   JSON.stringify({ type: "preuse_statement" })
      })
      const data = await res.json()
      setCelebResult(data)
    } catch { /* non-fatal */ }

    // Add a message to chat reflecting the outcome
    const outcomeText = type === "resisted"
      ? "I just had a craving and I resisted it."
      : "I just used. Logging it honestly."

    const next = [...messages, { role: "user", content: outcomeText }]
    setMessages(next)
    setSending(true)

    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        body:   JSON.stringify({
          messages:    next.map(m => ({ role: m.role, content: m.content })),
          messageType: type === "smoke" ? "slip" : "resisted"
        })
      })
      const data = await res.json()
      if (res.ok) {
        setMessages(curr => [...curr, { role: "assistant", content: data.reply }])
      }
    } catch { /* non-fatal */ }
    finally {
      setSending(false)
    }
  }

  return (
    <div className="chat-page">
      {showUrge && (
        <UrgeModal
          onResult={handleUrgeResult}
          onClose={() => setShowUrge(false)}
        />
      )}

      {celebResult && (
        <CelebrationToast
          result={celebResult}
          onDismiss={() => setCelebResult(null)}
        />
      )}

      <div className="chat-messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={"chat-bubble " + (m.role === "user" ? "chat-bubble-user" : "chat-bubble-agent")}
          >
            {m.content}
          </div>
        ))}

        {sending && (
          <div className="chat-typing" aria-label="Beora is thinking">
            <ParrotMascot height={44} className="chat-typing-parrot" />
          </div>
        )}

        {error && <div className="chat-bubble chat-bubble-error">{error}</div>}
      </div>

      {onboarded && (
        <button
          className="urge-fab"
          onClick={() => setShowUrge(true)}
          aria-label="I'm having an urge"
        >
          <FlameIcon />
          <span>I'm craving</span>
        </button>
      )}

      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-input"
          rows={1}
          placeholder={onboarded ? "Message Beora…" : "Reply to Beora…"}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={sending}
        />
        <button
          className="chat-send"
          onClick={send}
          disabled={!input.trim() || sending}
          aria-label="Send"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  )
}
