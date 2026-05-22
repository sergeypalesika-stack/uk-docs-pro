'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const C = { navy: '#0f1f3d', blue: '#2457a4', bg: '#f1f5fb', border: '#e2e8f4', text: '#1a2035', muted: '#7a8aaa', red: '#dc2626', green: '#16a34a' }
const inp: React.CSSProperties = { width: '100%', padding: '13px 14px', borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 15, color: C.text, outline: 'none', background: '#fff', boxSizing: 'border-box' }

export default function ResetPage() {
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  const handleReset = async () => {
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== password2) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/'), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(160deg, ${C.navy} 0%, #1a2e50 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '32px 28px', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>🔐</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginTop: 8 }}>Set New Password</div>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.green }}>Password updated!</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Redirecting to app…</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>New Password</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" style={inp} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Confirm Password</div>
              <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} placeholder="Repeat password" style={inp} onKeyDown={e => e.key === 'Enter' && handleReset()} />
            </div>
            {error && <div style={{ background: '#fee2e2', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.red }}>❌ {error}</div>}
            <button onClick={handleReset} disabled={loading} style={{ width: '100%', background: loading ? '#94a3b8' : C.navy, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '⏳ Saving…' : '🔐 Update Password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
