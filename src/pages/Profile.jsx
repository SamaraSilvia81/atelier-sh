import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSounds } from '../hooks/useSounds'
import { useProfile } from '../hooks/useProfile'
import { Camera, Save } from 'lucide-react'

export default function Profile() {
  const { user } = useAuth()
  const sounds = useSounds()
  const fileRef = useRef()
  const { profile, loading: profileLoading, saveProfile } = useProfile()

  const [form, setForm] = useState({ name: '', role: '', bio: '', website: '', github: '', twitter: '', avatar: '' })
  const [saved, setSaved] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    if (!profileLoading && profile) {
      setForm(f => ({ ...f, ...profile }))
      if (profile.avatar) setAvatarPreview(profile.avatar)
    }
  }, [profileLoading, profile])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setAvatarPreview(ev.target.result); set('avatar', ev.target.result) }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    const { error } = await saveProfile(form)
    if (!error) { sounds.play('save'); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    else sounds.play('error')
  }

  const S = {
    card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 24, marginBottom: 16 },
    lbl:  { fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 },
    inp:  { width: '100%', padding: '9px 11px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 12, borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 },
  }

  const initials = (form.name || user?.email || '?').slice(0, 2).toUpperCase()

  return (
    <div className="page-wrap">
      <header style={{ borderBottom: '1px solid var(--border)', padding: '14px 32px', background: 'var(--header-bg)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>
          atelier.sh <span style={{ color: 'var(--border-bright)', margin: '0 10px' }}>·</span>
          <span style={{ color: 'var(--text-sub)' }}>perfil</span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px var(--content-pad)' }}>
        <h1 style={{ fontFamily: 'var(--ff-disp)', fontSize: 28, letterSpacing: '0.05em', marginBottom: 4 }}>PERFIL</h1>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.22em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 28 }}>
          // atelier.sh · {user?.email}
        </div>

        {/* Avatar */}
        <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-red)' }} />
            ) : (
              <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-disp)', fontSize: 28, color: 'var(--red)', letterSpacing: '0.05em' }}>
                {initials}
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--red)', border: '2px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Camera size={12} color="#fff" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 22, letterSpacing: '0.04em', color: 'var(--text)', lineHeight: 1.1 }}>
              {form.name || <span style={{ color: 'var(--text-dim)' }}>sem nome</span>}
            </div>
            {form.role && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 4 }}>{form.role}</div>}
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{user?.email}</div>
          </div>
        </div>

        {/* Dados */}
        <div style={S.card}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 16 }}>DADOS PESSOAIS</div>
          <div style={S.grid}>
            <div><label style={S.lbl}>nome</label><input style={S.inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Samara Silvia Sabino" /></div>
            <div><label style={S.lbl}>cargo / função</label><input style={S.inp} value={form.role} onChange={e => set('role', e.target.value)} placeholder="Professora · Frontend Developer" /></div>
          </div>
          <div>
            <label style={S.lbl}>bio</label>
            <textarea style={{ ...S.inp, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Escreva uma bio curta..." />
          </div>
        </div>

        {/* Links */}
        <div style={S.card}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 16 }}>LINKS</div>
          <div style={S.grid}>
            <div><label style={S.lbl}>site / portfólio</label><input style={S.inp} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://seusite.com" /></div>
            <div><label style={S.lbl}>github</label><input style={S.inp} value={form.github} onChange={e => set('github', e.target.value)} placeholder="usuario" /></div>
          </div>
          <div style={{ maxWidth: '50%' }}>
            <label style={S.lbl}>twitter / x</label>
            <input style={S.inp} value={form.twitter} onChange={e => set('twitter', e.target.value)} placeholder="@usuario" />
          </div>
        </div>

        {/* Conta */}
        <div style={S.card}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 16 }}>CONTA</div>
          <div>
            <label style={S.lbl}>e-mail (Supabase)</label>
            <input style={{ ...S.inp, opacity: 0.5, cursor: 'not-allowed' }} value={user?.email || ''} readOnly />
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
              // e-mail gerenciado pelo Supabase
            </div>
          </div>
        </div>

        <button onClick={handleSave} className="btn btn-primary" style={{ gap: 8 }}>
          <Save size={13} /> {saved ? '✓ salvo' : 'salvar perfil'}
        </button>
      </div>
    </div>
  )
}
