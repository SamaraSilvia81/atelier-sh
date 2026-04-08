import { useState } from 'react'
import { X, UserMinus, Mail, Trash2, AlertCircle, RefreshCw } from 'lucide-react'
import { useOrgMembers } from '../../hooks/useOrgMembers'

export default function OrgMembersModal({ orgId, onClose }) {
  const { members, invites, loading, error, isAdmin, invite, revokeInvite, updateRole, removeMember, refresh } = useOrgMembers(orgId)
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState('viewer')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState(null)

  async function handleInvite() {
    if (!email.trim()) return
    setSaving(true)
    setErr(null)
    const { error } = await invite(email, role)
    if (error) setErr(error.message)
    else setEmail('')
    setSaving(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleInvite()
  }

  const mono = { fontFamily: 'var(--ff-mono)' }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

        {/* header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...mono, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            membros da organização
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* estado: carregando */}
          {loading && (
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
              carregando_
            </div>
          )}

          {/* estado: erro ao carregar */}
          {!loading && error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0', textAlign: 'center' }}>
              <AlertCircle size={20} color="var(--red)" />
              <div style={{ ...mono, fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                {error}
              </div>
              <button onClick={refresh} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} /> tentar novamente
              </button>
            </div>
          )}

          {/* estado: dados carregados */}
          {!loading && !error && (
            <>
              {/* lista de membros */}
              <div style={{ marginBottom: 24 }}>
                {members.length === 0 && (
                  <div style={{ ...mono, fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', padding: '12px 0' }}>
                    nenhum membro ainda
                  </div>
                )}
                {members.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ ...mono, fontSize: 12, color: 'var(--text)' }}>
                        {m.profiles?.name || m.user_id}
                      </div>
                      <div style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {m.role}
                      </div>
                    </div>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select
                          value={m.role}
                          onChange={e => updateRole(m.id, e.target.value)}
                          style={{ ...mono, fontSize: 11, background: 'var(--bg-alt)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 8px' }}
                        >
                          <option value="viewer">viewer</option>
                          <option value="admin">admin</option>
                        </select>
                        <button
                          onClick={() => removeMember(m.id)}
                          title="Remover membro"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
                        >
                          <UserMinus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* convites pendentes */}
              {invites.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ ...mono, fontSize: 10, letterSpacing: '0.2em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 10 }}>
                    convites pendentes
                  </div>
                  {invites.map(inv => (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ ...mono, fontSize: 12, color: 'var(--text-dim)' }}>
                        {inv.email}
                        <span style={{ color: 'var(--text-dim)', fontSize: 10, marginLeft: 6 }}>· {inv.role}</span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => revokeInvite(inv.id)}
                          title="Revogar convite"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* convidar — só para admins */}
              {isAdmin && (
                <div>
                  <div style={{ ...mono, fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                    convidar por e-mail
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="email@exemplo.com"
                      type="email"
                      style={{ flex: 1, ...mono, fontSize: 12, background: 'var(--bg-alt)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', outline: 'none' }}
                    />
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      style={{ ...mono, fontSize: 11, background: 'var(--bg-alt)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px' }}
                    >
                      <option value="viewer">viewer</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      onClick={handleInvite}
                      disabled={saving || !email.trim()}
                      className="btn btn-primary"
                      title="Enviar convite"
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Mail size={13} />
                    </button>
                  </div>
                  {err && (
                    <div style={{ ...mono, fontSize: 11, color: 'var(--red)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertCircle size={12} /> {err}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}