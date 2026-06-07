import { useState, useRef, useEffect } from "react"
import { apiFetch, getUser } from "../utils/auth"
import ParrotMascot from "./ParrotMascot"

const GREETING = "Hey, I'm Beora — your concierge here at Red Door. I can help with the schedule, what's coming up next, or just talk through whatever's on your mind. What's going on?"

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

export default function ChatPage() {
  const user = getUser()
  const [messages, setMessages] = useState([
    { role: "assistant", content: GREETING }
  ])
  const [input, setInput]       = useState("")
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState("")
  const scrollRef               = useRef(null)
  const inputRef                = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  async function send() {
    const text = input.trim()
    if (!text || sending) return

    setError("")
    const next = [...messages, { role: "user", content: text }]
    setMessages(next)
    setInput("")
    setSending(true)

    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        body:   JSON.stringify({
          messages: next.filter(m => m.role !== "system").map(m => ({
            role:    m.role,
            content: m.content
          })),
          userName: user?.name
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again in a moment.")
        setSending(false)
        return
      }
      setMessages(curr => [...curr, { role: "assistant", content: data.reply }])
    } catch {
      setError("Couldn't reach Beora. Check your connection and try again.")
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

  return (
    <div className="chat-page">
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

      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-input"
          rows={1}
          placeholder="Message Beora…"
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
