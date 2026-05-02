import { useState } from 'react'
import { useAuth } from './hooks/useAuth'

const card = {
  background: '#fff',
  borderRadius: 18,
  border: '0.5px solid var(--border, #e0ddd5)',
  padding: '1.75rem',
  boxShadow: '0 2px 24px rgba(0,0,0,0.06)',
}

export default function LoginPage() {
  const { signInWithEmail, signInWithGoogle } = useAuth()
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleMagicLink(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true); setError('')
    try {
      const { error } = await signInWithEmail(email.trim())
      if (error) setError(error.message)
      else setSent(true)
    } catch (e) {
      // Browser fetch failures (e.g. wrong Supabase URL, no network) surface
      // here as TypeError "Load failed" / "Failed to fetch". Translate to
      // something actionable.
      const raw = e?.message || String(e)
      if (/load failed|failed to fetch|networkerror/i.test(raw)) {
        setError(
          "Can't reach Supabase. Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY " +
          "are set, the dev server has been restarted since editing .env.local, and that " +
          `${window.location.origin} is in Supabase Auth → URL Configuration → Redirect URLs.`
        )
      } else {
        setError(raw)
      }
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(145deg, #B85C38, #D88A60)',
            borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 20px rgba(184,92,56,0.25)',
            fontSize: 28,
          }}>🍽</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Mills Dinner Planner
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-muted, #6b6b6b)' }}>Sign in to see this week's plan</p>
        </div>

        <div style={card}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, background: '#E4EDE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <span style={{ fontSize: 26 }}>✉️</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Check your email</p>
              <p style={{ fontSize: 13, color: 'var(--ink-muted, #6b6b6b)', lineHeight: 1.5 }}>
                We sent a magic link to<br/>
                <strong>{email}</strong>
              </p>
              <button
                onClick={() => setSent(false)}
                style={{ marginTop: 18, fontSize: 13, color: 'var(--ink-muted, #6b6b6b)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={signInWithGoogle}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: 11, borderRadius: 12,
                  border: '0.5px solid #d8d6d0',
                  background: '#fff',
                  cursor: 'pointer', fontSize: 14, fontWeight: 500,
                  marginBottom: 16,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 0.5, background: '#e4e2dc' }}/>
                <span style={{ fontSize: 12, color: '#a0a0a0' }}>or</span>
                <div style={{ flex: 1, height: 0.5, background: '#e4e2dc' }}/>
              </div>

              <form onSubmit={handleMagicLink}>
                <label style={{ fontSize: 12, color: '#6b6b6b', display: 'block', marginBottom: 6, fontWeight: 500, letterSpacing: '0.02em' }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  style={{
                    width: '100%', marginBottom: 12,
                    fontSize: 15, padding: '11px 14px',
                    border: '0.5px solid #d8d6d0', borderRadius: 12,
                    background: '#f5f4f1', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {error && <p style={{ color: '#B71C1C', fontSize: 12, marginBottom: 10 }}>{error}</p>}
                <button
                  type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: 11,
                    background: loading ? '#f0efeb' : 'linear-gradient(135deg, #B85C38, #D88A60)',
                    color: loading ? '#6b6b6b' : '#fff',
                    border: 'none', borderRadius: 12,
                    fontSize: 14, fontWeight: 600,
                    cursor: loading ? 'default' : 'pointer',
                  }}
                >
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </form>

              <p style={{ fontSize: 12, color: '#a0a0a0', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
                Access by invitation only.<br/>Ask Jim or Shannon to invite you.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
