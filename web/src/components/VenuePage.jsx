import { useState } from "react"
import VenueGallery from "./VenueGallery"
import { VENUE, WIFI } from "../data/static"

const TABS = ["Gallery", "History", "Rooms", "Rules"]

function CopyIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
}
function MapIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
}
function WifiIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" strokeLinecap="round"/></svg>
}

export default function VenuePage() {
  const [tab, setTab]       = useState("Gallery")
  const [copied, setCopied] = useState(false)

  function copyPassword() {
    navigator.clipboard.writeText(WIFI.password).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="page">
      <h2 className="page-title">{VENUE.name}</h2>
      <p className="page-sub">21918 E Cliff Dr · Santa Cruz</p>

      {/* WiFi — always visible */}
      <div className="wifi-card">
        <div className="wifi-header"><WifiIcon/><span>WiFi</span></div>
        <div className="wifi-row">
          <div><div className="wifi-label">Network</div><div className="wifi-value">{WIFI.network}</div></div>
        </div>
        <div className="wifi-row">
          <div><div className="wifi-label">Password</div><div className="wifi-value">{WIFI.password}</div></div>
          <button className="wifi-copy-btn" onClick={copyPassword}><CopyIcon/> {copied ? "Copied!" : "Copy"}</button>
        </div>
      </div>

      {/* Address — always visible */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-label">Address</div>
        <a href={VENUE.mapsUrl} target="_blank" rel="noreferrer" style={{display:"block",fontSize:16,fontWeight:600,color:"var(--primary)",marginBottom:8,textDecoration:"none"}}>{VENUE.address}</a>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <a href={VENUE.mapsUrl} target="_blank" rel="noreferrer" className="map-link"><MapIcon/> Open in Maps</a>
          <a href={"tel:" + VENUE.phone.replace(/[^0-9]/g,"")} className="map-link">📞 {VENUE.phone}</a>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t} className={"tab-btn" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Gallery */}
      {tab === "Gallery" && <VenueGallery />}

      {/* History */}
      {tab === "History" && (
        <div>
          <div className="card" style={{marginBottom:12}}>
            <p style={{fontSize:14,color:"var(--mid)",lineHeight:1.75,marginBottom:12}}>
              Villa Maria Del Mar has been a place of peace and hospitality on the Santa Cruz coast since 1892 — 
              over 130 years of welcoming people who need a break from the pressures of life.
            </p>
            <p style={{fontSize:14,color:"var(--mid)",lineHeight:1.75,marginBottom:12}}>
              The story begins in 1891, when three generous Live Oak pioneers — Patrick Moran, James Corcoran, 
              and Henry Johans — donated a bluff-top parcel overlooking the Pacific to the Catholic Ladies Aid 
              Society of San Francisco. By June 1892, Hotel Santa Maria Del Mar opened its doors, largely 
              through the tireless efforts of Grand Senior Vice President Lucy A. Wilson, who walked daily 
              from Del Mar to Santa Cruz to supervise construction.
            </p>
            <p style={{fontSize:14,color:"var(--mid)",lineHeight:1.75,marginBottom:12}}>
              In 1906, the Sacred Heart Chapel was dedicated on the grounds by Bishop T.G. Conaty, Bishop of 
              Los Angeles and Monterey. The chapel that stands today — with custom teak pews installed in 
              1982 and a full renovation completed in 2004 — is the same sacred space that has anchored this 
              property for over a century.
            </p>
            <p style={{fontSize:14,color:"var(--mid)",lineHeight:1.75,marginBottom:12}}>
              In 1963, the Sisters of the Holy Names of Jesus and Mary purchased the Villa, beginning a 
              ministry of hospitality that continues today. Under their care the center has hosted clergy, 
              educators, 12-step groups, social justice organizations, and individuals seeking quiet time 
              by the sea. In 2012 alone, they hosted 710 events and welcomed 4,625 visitors.
            </p>
            <p style={{fontSize:14,color:"var(--mid)",lineHeight:1.75}}>
              The Sisters describe their work simply: "We do not offer retreats. We offer hospitality." 
              The dining room, conference rooms, and many of the 41 guest rooms overlook the ocean. 
              The sound of the surf can be heard from nearly every corner of the property.
              The Memorable Men's Retreat is proud to call this extraordinary place home.
            </p>
          </div>
        </div>
      )}

      {/* Rooms */}
      {tab === "Rooms" && (
        <div>
          {VENUE.rooms.map((r,i) => (
            <div key={i} className="card" style={{marginBottom:10}}>
              <div className="card-title">{r.name}</div>
              <div className="card-body">{r.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Rules */}
      {tab === "Rules" && (
        <div>
          {VENUE.rules.map((r,i) => (
            <div key={i} className="card" style={{marginBottom:10}}>
              <div style={{fontSize:14,color:"var(--mid)"}}>{r}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
