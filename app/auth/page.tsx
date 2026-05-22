'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'register' | 'forgot'

const C = {
  navy: '#0f1f3d', navyM: '#1a2e50',
  blue: '#2457a4', accent: '#3b82f6',
  bg: '#f1f5fb', border: '#e2e8f4',
  text: '#1a2035', muted: '#7a8aaa',
  red: '#dc2626', green: '#16a34a',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '13px 14px', borderRadius: 12,
  border: `1.5px solid ${C.border}`, fontSize: 15,
  color: C.text, outline: 'none', background: '#fff',
  boxSizing: 'border-box',
}

export default function AuthPage() {
  const [mode,     setMode]     = useState<Mode>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')
  const [showPass, setShowPass] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true)

    try {
      if (mode === 'register') {
        if (!name.trim()) { setError('Please enter your name'); setLoading(false); return }
        if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return }

        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name } }
        })
        if (error) throw error
        setSuccess('Check your email to confirm your account!')

      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
        router.refresh()

      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        })
        if (error) throw error
        setSuccess('Password reset email sent! Check your inbox.')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      if (msg.includes('Invalid login')) setError('Invalid email or password')
      else if (msg.includes('already registered')) setError('This email is already registered')
      else if (msg.includes('valid email')) setError('Please enter a valid email')
      else setError(msg)
    }

    setLoading(false)
  }

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navyM} 50%, #1e3a5f 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🇬🇧</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>UK Docs</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
          Your secure UK document wallet
        </div>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 24, padding: '32px 28px', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* Mode tabs */}
        <div style={{ display: 'flex', background: C.bg, borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {(['login', 'register'] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }} style={{
              flex: 1, background: mode === m ? '#fff' : 'transparent',
              border: 'none', borderRadius: 10, padding: '9px 0',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              color: mode === m ? C.navy : C.muted,
              boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}>
              {m === 'login' ? '🔑 Sign In' : '📝 Register'}
            </button>
          ))}
        </div>

        {mode === 'forgot' && (
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Back to Sign In
            </button>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginTop: 12 }}>Reset Password</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Enter your email and we'll send a reset link</div>
          </div>
        )}

        {/* Name field (register only) */}
        {mode === 'register' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Full Name</div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Sergii Palesika"
              style={inp}
              autoComplete="name"
            />
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Email</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKey}
            placeholder="you@example.com"
            style={inp}
            autoComplete="email"
          />
        </div>

        {/* Password */}
        {mode !== 'forgot' && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Password</div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKey}
                placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                style={{ ...inp, paddingRight: 44 }}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button onClick={() => setShowPass(s => !s)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.muted,
              }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>
        )}

        {/* Forgot password link */}
        {mode === 'login' && (
          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <button onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
              style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              Forgot password?
            </button>
          </div>
        )}

        {mode !== 'login' && <div style={{ height: 20 }} />}

        {/* Error / Success */}
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.red, display: 'flex', alignItems: 'center', gap: 8 }}>
            ❌ {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.green, display: 'flex', alignItems: 'center', gap: 8 }}>
            ✅ {success}
          </div>
        )}

        {/* Submit button */}
        <button onClick={handleSubmit} disabled={loading || !email} style={{
          width: '100%', background: loading ? '#94a3b8' : C.navy,
          color: '#fff', border: 'none', borderRadius: 12,
          padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}>
          {loading ? '⏳ Please wait…' : mode === 'login' ? '🔑 Sign In' : mode === 'register' ? '🚀 Create Account' : '📧 Send Reset Link'}
        </button>

        {/* Privacy note */}
        <div style={{ marginTop: 20, padding: '12px 14px', background: C.bg, borderRadius: 10, fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 1.5 }}>
          🔒 Your data is encrypted and only accessible to you. We never share your information.
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
        Powered by Supabase · End-to-end secure
      </div>
    </div>
  )
}
