import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { Camera, ArrowRight } from 'lucide-react'

export default function Onboarding() {
  const { user }  = useAuth()
  const { saveProfile } = useProfile()
  const navigate  = useNavigate()
  const fileRef   = useRef()

  const [name,    setName]    = useState('')
  const [role,    setRole]    = useState('')
  const [avatar,  setAvatar]  = useState('')
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setPreview(ev.target.result); setAvatar(ev.target.result) }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!name.trim()) { setError('Informe seu nome para continuar.'); return }
    setLoading(true); setError('')
    const { error } = await saveProfile({ name: name.trim(), role: role.trim(), avatar })
    if (error) { setError('Não foi possível salvar. Tente novamente.'); setLoading(false); return }
    navigate('/')
  }

  const initials = name ? name.slice(0, 2).toUpperCase() : (user?.email?.[0] || '?').toUpperCase()

  const inp = {
    width: '100%', padding: '10px 13px',
    background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 12,
    borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box',
  }
  const lbl = {
    display: 'block', fontFamily: 'var(--ff-mono)', fontSize: 9,
    letterSpacing: '0.28em', color: 'var(--text-dim)',
    textTransform: 'uppercase', marginBottom: 5,
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '20%', right: '20%',
        width: 400, height: 400,
        background: 'radial-gradient(ellipse, rgba(158,26,23,0.07), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>

        {/* header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 36, letterSpacing: '0.1em', color: 'var(--text)', marginBottom: 6 }}>
            ATELIER<span style={{ color: 'var(--red)' }}>.SH</span>
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.3em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            configure seu perfil
          </div>
          <div style={{ width: 32, height: 1, background: 'var(--red)', margin: '14px auto 0' }} />
        </div>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-red)',
          borderRadius: 'var(--radius-md)', padding: 32,
        }}>
          {/* avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              {preview ? (
                <img src={preview} alt="avatar" style={{
                  width: 88, height: 88, borderRadius: '50%',
                  objectFit: 'cover', border: '2px solid var(--border-red)',
                }} />
              ) : (
                <div style={{
                  width: 88, height: 88, borderRadius: '50%',
                  background: 'var(--surface)', border: '2px solid var(--border-red)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--ff-disp)', fontSize: 28, color: 'var(--red)',
                }}>
                  {initials}
                </div>
              )}
              <button onClick={() => fileRef.current?.click()} style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--red)', border: '2px solid var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <Camera size={13} color="#fff" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              foto de perfil (opcional)
            </div>
          </div>

          {/* campos */}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>seu nome *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Samara Sabino"
              style={inp} autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>cargo / função</label>
            <input
              value={role} onChange={e => setRole(e.target.value)}
              placeholder="Ex: Professora, Designer, Dev..."
              style={inp}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          {error && (
            <div style={{
              fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--red)',
              padding: '8px 12px', background: 'var(--red-dim)',
              border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', marginBottom: 16,
            }}>{error}</div>
          )}

          <button
            onClick={handleSave} disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '...' : <><ArrowRight size={14} /> entrar no atelier</>}
          </button>
        </div>

        <div style={{
          textAlign: 'center', marginTop: 16,
          fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)',
          letterSpacing: '0.15em',
        }}>
          <button onClick={() => navigate('/')} style={{
            background: 'none', border: 'none', color: 'var(--text-dim)',
            fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.15em',
            cursor: 'pointer', textDecoration: 'underline',
          }}>
            pular por agora
          </button>
        </div>
      </div>
    </div>
  )
}
