import { useState } from "react"
import { signInWithGoogle } from "../utils/firebase"
import ParrotMascot from "./ParrotMascot"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  async function handleGoogleSignIn() {
    setError("")
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Sign-in failed. Please try again.")
      }
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <ParrotMascot height={96} className="login-parrot" />
        <div className="login-wordmark">beora</div>
        <div className="login-tagline">Quit Coach</div>
      </div>

      <div className="login-form">
        <p className="login-intro">
          Your personal quit coach. Built on the science of how your brain actually works.
        </p>

        <button
          className="login-google-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <GoogleIcon />
          {loading ? "Signing in…" : "Continue with Google"}
        </button>

        {error && <div className="login-error">{error}</div>}
      </div>

      <div className="login-footer">
        Free to use · Your data stays yours
      </div>
    </div>
  )
}
