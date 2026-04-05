import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    if (mode === 'in') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
      else navigate('/')
    } else {
      const { error } = await signUp(email, password)
      if (error) setError(error.message)
      else setSuccess('Verifique seu e-mail para confirmar o cadastro.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* glow de fundo */}
      <div style={{
        position: 'absolute', top: '20%', right: '20%',
        width: 400, height: 400,
        background: 'radial-gradient(ellipse, rgba(158,26,23,0.07), transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{
            fontFamily: 'var(--ff-disp)',
            fontSize: 48,
            letterSpacing: '0.1em',
            lineHeight: 1,
            color: 'var(--text)',
            marginBottom: 8
          }}>
            ATELIER<span style={{ color: 'var(--red)' }}>.SH</span>
          </div>
          <div style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: '0.55rem',
            letterSpacing: '0.4em',
            color: 'var(--text-dim)',
            textTransform: 'uppercase'
          }}>
            gestão de projetos de turma
          </div>
          <div style={{
            width: 40, height: 1,
            background: 'var(--red)',
            margin: '16px auto 0'
          }} />
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-red)',
          borderRadius: 'var(--radius-md)',
          padding: 36,
        }}>

          {/* Tab mode */}
          <div style={{
            display: 'flex',
            gap: 0,
            marginBottom: 28,
            borderBottom: '1px solid var(--border)',
          }}>
            {[['in', 'entrar'], ['up', 'cadastrar']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1,
                paddingBottom: 12,
                fontFamily: 'var(--ff-mono)',
                fontSize: '0.58rem',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: mode === m ? 'var(--red)' : 'var(--text-dim)',
                borderBottom: mode === m ? '2px solid var(--red)' : '2px solid transparent',
                marginBottom: -1,
                background: 'none',
                border: 'none',
                borderBottom: mode === m ? '2px solid var(--red)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all var(--fast) var(--ease)'
              }}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>e-mail</label>
              <input
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>

            <div className="field">
              <label>senha</label>
              <input
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div style={{
                fontFamily: 'var(--ff-mono)', fontSize: '0.65rem',
                color: 'var(--red)', padding: '8px 12px',
                background: 'var(--red-dim)', border: '1px solid var(--border-red)',
                borderRadius: 'var(--radius)', marginBottom: 16
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                fontFamily: 'var(--ff-mono)', fontSize: '0.65rem',
                color: '#5aab6e', padding: '8px 12px',
                background: 'rgba(40,120,60,0.1)', border: '1px solid rgba(40,120,60,0.2)',
                borderRadius: 'var(--radius)', marginBottom: 16
              }}>
                {success}
              </div>
            )}

            <button type="submit" className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }}>
              {loading ? '...' : mode === 'in' ? 'entrar' : 'criar conta'}
            </button>
          </form>
        </div>

        {/* rodapé */}
        <div style={{
          textAlign: 'center', marginTop: 24,
          fontFamily: 'var(--ff-mono)', fontSize: '0.5rem',
          letterSpacing: '0.2em', color: 'var(--text-dim)',
          textTransform: 'uppercase'
        }}>
          ETE Cícero Dias · 2026
        </div>
      </div>
    </div>
  )
}
