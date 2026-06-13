import { NavLink } from "react-router-dom"

function CoachIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function RewardsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

export default function Nav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/app/coach" className={({ isActive }) => "nav-tab" + (isActive ? " active" : "")}>
        <CoachIcon />
        <span>Coach</span>
      </NavLink>
      <NavLink to="/app/rewards" className={({ isActive }) => "nav-tab" + (isActive ? " active" : "")}>
        <RewardsIcon />
        <span>Rewards</span>
      </NavLink>
    </nav>
  )
}
