import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function Login() {
  
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  const [mode,     setMode]     = useState('in')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    if (mode === 'in') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
      else navigate(redirectTo)
    } else {
      const { error } = await signUp(email, password)
      if (error) setError(error.message)
      else navigate(redirectTo !== '/' ? redirectTo : '/onboarding')
    }
    setLoading(false)
  }

  async function handleGoogle() {
    setError(''); setLoading(true)
    const { error } = await signInWithGoogle()
    if (error) { setError(error.message); setLoading(false) }
  }

  const inp = { width: '100%', padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 12, borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 5 }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '20%', right: '20%', width: 400, height: 400, background: 'radial-gradient(ellipse, rgba(158,26,23,0.07), transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 48, letterSpacing: '0.1em', lineHeight: 1, color: 'var(--text)', marginBottom: 10 }}>
            ATELIER<span style={{ color: 'var(--red)' }}>.SH</span>
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.3em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            gestão colaborativa de projetos
          </div>
          <div style={{ width: 40, height: 1, background: 'var(--red)', margin: '16px auto 0' }} />
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', padding: 36 }}>
          <div style={{ display: 'flex', marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
            {[['in', 'entrar'], ['up', 'cadastrar']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, paddingBottom: 12, fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: mode === m ? 'var(--red)' : 'var(--text-dim)', background: 'none', border: 'none', borderBottom: mode === m ? '2px solid var(--red)' : '2px solid transparent', marginBottom: -1, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>e-mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" style={inp} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>senha</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inp} />
            </div>

            {error   && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', marginBottom: 16 }}>{error}</div>}
            {success && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: '#5aab6e', padding: '8px 12px', background: 'rgba(40,120,60,0.1)', border: '1px solid rgba(40,120,60,0.2)', borderRadius: 'var(--radius)', marginBottom: 16 }}>{success}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
              {loading ? '...' : mode === 'in' ? 'entrar' : 'criar conta'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>ou</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.1em', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all var(--fast)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-red)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            continuar com Google
          </button>
        </div>
      </div>
    </div>
  )
}