import { useState } from 'react'
import { X, UserPlus, Trash2, Crown, Eye, Mail, RefreshCw } from 'lucide-react'
import { useOrgMembers } from '../../hooks/useOrgMembers'
import { useAuth } from '../../hooks/useAuth'

export default function OrgMembersModal({ org, onClose }) {
  const { user } = useAuth()
  const { members, invites, isAdmin, loading, invite, revokeInvite, updateRole, removeMember } = useOrgMembers(org.id)

  const [email,     setEmail]     = useState('')
  const [role,      setRole]      = useState('viewer')
  const [inviting,  setInviting]  = useState(false)
  const [msg,       setMsg]       = useState('')

  async function handleInvite() {
    if (!email.trim()) return
    setInviting(true); setMsg('')
    const { error } = await invite(email.trim(), role)
    if (error) setMsg('Erro: ' + (error.message || 'tente novamente'))
    else { setMsg('Convite enviado! Compartilhe o link abaixo.'); setEmail('') }
    setInviting(false)
  }

  const inp = { padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 520, padding: 28, maxHeight: '85vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, letterSpacing: '0.05em' }}>MEMBROS</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>// {org.name}</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        {/* Membros atuais */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.3em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 10 }}>membros ({members.length})</div>
          {loading
            ? <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>carregando_</div>
            : members.map(m => {
              const isMe = m.user_id === user?.id
              const isOwner = m.user_id === org.owner_id
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  {/* avatar placeholder */}
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-disp)', fontSize: 13, color: 'var(--red)', flexShrink: 0 }}>
                    {(m.profiles?.name || m.user_id)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.profiles?.name || m.user_id.substring(0, 12) + '...'} {isMe && <span style={{ color: 'var(--text-dim)' }}>(você)</span>}
                    </div>
                  </div>

                  {/* badge de role */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isOwner && <Crown size={10} style={{ color: '#c8922a' }} />}
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: m.role === 'admin' ? '#c8922a' : 'var(--text-dim)' }}>
                      {isOwner ? 'dono' : m.role}
                    </span>
                  </div>

                  {/* ações — só admins, não no próprio dono */}
                  {isAdmin && !isOwner && !isMe && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => updateRole(m.id, m.role === 'admin' ? 'viewer' : 'admin')} title={m.role === 'admin' ? 'tornar viewer' : 'tornar admin'} style={{ padding: 4, color: 'var(--text-dim)', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                        {m.role === 'admin' ? <Eye size={11} /> : <Crown size={11} />}
                      </button>
                      <button onClick={() => removeMember(m.id)} title="remover" style={{ padding: 4, color: 'var(--text-dim)', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          }
        </div>

        {/* Convites pendentes */}
        {invites.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.3em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 10 }}>pendentes ({invites.length})</div>
            {invites.map(inv => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <Mail size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{inv.email}</span>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{inv.role}</span>
                {isAdmin && (
                  <button onClick={() => revokeInvite(inv.id)} title="revogar convite" style={{ padding: 4, color: 'var(--text-dim)', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Convidar (só admins) */}
        {isAdmin && (
          <div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.3em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 10 }}>convidar por e-mail</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="email@exemplo.com"
                style={{ ...inp, flex: 1 }} />
              <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inp, appearance: 'none', paddingRight: 10 }}>
                <option value="viewer">viewer</option>
                <option value="admin">admin</option>
              </select>
              <button onClick={handleInvite} disabled={inviting || !email.trim()} className="btn btn-primary" style={{ flexShrink: 0, opacity: !email.trim() ? 0.4 : 1 }}>
                {inviting ? '...' : <><UserPlus size={12} /> convidar</>}
              </button>
            </div>
            {msg && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: msg.startsWith('Erro') ? 'var(--red)' : '#5aab6e', marginBottom: 8 }}>{msg}</div>}

            {/* info sobre como funciona */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 12, fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8, borderLeft: '2px solid var(--border-red)' }}>
              <div style={{ color: 'var(--text-sub)', marginBottom: 4 }}>// roles:</div>
              <div><span style={{ color: '#c8922a' }}>admin</span> — edita grupos, notas, reviews, gerencia membros</div>
              <div><span style={{ color: 'var(--text-sub)' }}>viewer</span> — só leitura, não edita nada</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
