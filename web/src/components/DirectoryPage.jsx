import { useState, useEffect } from "react"

function useContacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState(null)
  useEffect(() => {
    fetch("/.netlify/functions/contacts")
      .then(r => r.json())
      .then(data => { setContacts(data.contacts || []); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])
  return { contacts, loading, error }
}

function makeVCard(c) {
  return ["BEGIN:VCARD","VERSION:3.0",
    "FN:" + c.name,
    c.email ? "EMAIL:" + c.email : "",
    c.phone ? "TEL:"   + c.phone : "",
    c.city  ? "ADR:;;" + c.city + ";;;;" : "",
    "END:VCARD"
  ].filter(Boolean).join("\r\n")
}

function downloadVCard(c) {
  const blob = new Blob([makeVCard(c)], { type: "text/vcard" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = c.name.replace(/[^a-z0-9]/gi,"-") + ".vcf"
  a.click()
}

function downloadAll(contacts) {
  const blob = new Blob([contacts.map(makeVCard).join("\r\n")], { type: "text/vcard" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = "memorable-retreat-contacts.vcf"
  a.click()
}

function initials(name) {
  return name.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase()
}

function DownIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}

export default function DirectoryPage() {
  const { contacts, loading, error } = useContacts()

  if (loading) return (
    <div className="page">
      <h2 className="page-title">Directory</h2>
      <p className="page-sub">Retreat attendees</p>
      <div className="placeholder"><div className="spinner"/><p style={{marginTop:16,color:"var(--muted)"}}>Loading contacts...</p></div>
    </div>
  )

  if (error) return (
    <div className="page">
      <h2 className="page-title">Directory</h2>
      <div className="warning" style={{marginTop:20}}>Could not load the directory. Try again later.</div>
    </div>
  )

  return (
    <div className="page">
      <h2 className="page-title">Directory</h2>
      <p className="page-sub">{contacts.length} attendee{contacts.length !== 1 ? "s" : ""} · opt-in only</p>

      {contacts.length > 1 && (
        <button className="dl-btn" onClick={() => downloadAll(contacts)}>
          <DownIcon/> Download All Contacts
        </button>
      )}

      {contacts.map((c,i) => (
        <div key={i} className="contact-card">
          <div className="contact-avatar">{initials(c.name)}</div>
          <div className="contact-info">
            <div className="contact-name">{c.name}</div>
            {c.city  && <div className="contact-meta">{c.city}</div>}
            {c.email && <div className="contact-meta">{c.email}</div>}
            {c.phone && <div className="contact-meta">{c.phone}</div>}
          </div>
        </div>
      ))}

      {contacts.length === 0 && (
        <div className="placeholder">
          <h3>No contacts yet</h3>
          <p>Contacts appear here once attendees submit the opt-in form.</p>
        </div>
      )}
    </div>
  )
}
