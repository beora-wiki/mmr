import { NavLink } from "react-router-dom"

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ScheduleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8"  y1="2" x2="8"  y2="6" />
      <line x1="3"  y1="10" x2="21" y2="10" />
    </svg>
  )
}

export default function Nav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/app/chat" className={({ isActive }) => "nav-tab" + (isActive ? " active" : "")}>
        <ChatIcon />
        <span>Chat</span>
      </NavLink>
      <NavLink to="/app/schedule" className={({ isActive }) => "nav-tab" + (isActive ? " active" : "")}>
        <ScheduleIcon />
        <span>Schedule</span>
      </NavLink>
    </nav>
  )
}
