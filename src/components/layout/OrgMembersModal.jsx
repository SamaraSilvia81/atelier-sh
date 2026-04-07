import { useState } from 'react'
import { X, UserPlus, Trash2, Crown, Eye, Mail, Shield, User, Check, AlertCircle } from 'lucide-react'
import { useOrgMembers } from '../../hooks/useOrgMembers'
import { useAuth } from '../../hooks/useAuth'

const ROLE_CONFIG = {
  owner: { label: 'Dono',   color: '#c8922a', icon: Crown,  desc: 'Acesso total, não pode ser removido' },
  admin: { label: 'Admin',  color: 'var(--red)', icon: Shield, desc: 'Cria/edita grupos, gerencia membros' },
  viewer:{ label: 'Viewer', color: 'var(--text-dim)', icon: Eye,    desc: 'Só leitura, não edita nada' },
}

function RoleTag({ role }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.viewer
  const Icon = cfg.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: cfg.color, border: `1px solid ${cfg.color}`, borderRadius: 3, padding: '2px 6px' }}>
      <Icon size={9} /> {cfg.label}
    </span>
  )
}

export default function OrgMembersModal({ org, onClose }) {
  const { user } = useAuth()
  const { members, invites, isAdmin, loading, invite, revokeInvite, updateRole, removeMember } = useOrgMembers(org.id)

  const [tab,       setTab]       = useState('members') // 'members' | 'invite'
  const [email,     setEmail]     = useState('')
  const [role,      setRole]      = useState('viewer')
  const [inviting,  setInviting]  = useState(false)
  const [msg,       setMsg]       = useState(null) // { type: 'ok'|'err', text }
  const [changingId,setChangingId]= useState(null)

  async function handleInvite() {
    if (!email.trim()) return
    setInviting(true); setMsg(null)
    const { error } = await invite(email.trim(), role)
    if (error) setMsg({ type: 'err', text: error.message || 'Tente novamente.' })
    else { setMsg({ type: 'ok', text: `Convite enviado para ${email.trim()}!` }); setEmail('') }
    setInviting(false)
  }

  async function handleRoleChange(memberId, newRole) {
    setChangingId(memberId)
    await updateRole(memberId, newRole)
    setChangingId(null)
  }

  const inp = {
    padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11,
    borderRadius: 'var(--radius)', outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  const TabBtn = ({ id, label, count }) => (
    <button onClick={() => setTab(id)} style={{
      padding: '8px 16px', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.15em',
      textTransform: 'uppercase', cursor: 'pointer', background: 'none',
      borderBottom: tab === id ? '2px solid var(--red)' : '2px solid transparent',
      color: tab === id ? 'var(--text)' : 'var(--text-dim)',
      border: 'none', borderBottom: tab === id ? '2px solid var(--red)' : '2px solid transparent',
    }}>
      {label}{count != null ? ` (${count})` : ''}
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 640, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 22, letterSpacing: '0.05em' }}>MEMBROS</div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>// {org.name}</div>
            </div>
            <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 0 }}>
            <TabBtn id="members" label="// membros" count={members.length} />
            {invites.length > 0 && <TabBtn id="pending" label="// pendentes" count={invites.length} />}
            {isAdmin && <TabBtn id="invite" label="// convidar" />}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>

          {/* ── TAB: MEMBROS ── */}
          {tab === 'members' && (
            <div>
              {loading ? (
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', padding: '20px 0' }}>carregando_</div>
              ) : members.length === 0 ? (
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', padding: '20px 0' }}>nenhum membro ainda.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['membro', 'role', 'ações'].map(h => (
                        <th key={h} style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', textAlign: 'left', padding: '6px 8px', fontWeight: 400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => {
                      const isMe    = m.user_id === user?.id
                      const isOwner = m.user_id === org.owner_id
                      const displayRole = isOwner ? 'owner' : (m.role || 'viewer')
                      const initials = (m.profiles?.name || m.user_id || '?')[0].toUpperCase()

                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background var(--fast)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          {/* Avatar + nome */}
                          <td style={{ padding: '10px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--red-dim)', border: '1px solid var(--border-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-disp)', fontSize: 13, color: 'var(--red)', flexShrink: 0 }}>
                                {initials}
                              </div>
                              <div>
                                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text)' }}>
                                  {m.profiles?.name || m.user_id?.substring(0,12) + '...'}
                                  {isMe && <span style={{ color: 'var(--text-dim)', fontSize: 9, marginLeft: 6 }}>(você)</span>}
                                </div>
                                {m.profiles?.role && (
                                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', marginTop: 1 }}>{m.profiles.role}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role — admin pode trocar */}
                          <td style={{ padding: '10px 8px' }}>
                            {isAdmin && !isOwner && !isMe ? (
                              <select
                                value={m.role || 'viewer'}
                                disabled={changingId === m.id}
                                onChange={e => handleRoleChange(m.id, e.target.value)}
                                style={{ ...inp, width: 'auto', padding: '4px 8px', fontSize: 10, opacity: changingId === m.id ? 0.5 : 1 }}
                              >
                                <option value="viewer">Viewer</option>
                                <option value="admin">Admin</option>
                              </select>
                            ) : (
                              <RoleTag role={displayRole} />
                            )}
                          </td>

                          {/* Ações */}
                          <td style={{ padding: '10px 8px' }}>
                            {isAdmin && !isOwner && !isMe && (
                              <button
                                onClick={() => removeMember(m.id)}
                                title="remover membro"
                                style={{ padding: '4px 6px', color: 'var(--text-dim)', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--ff-mono)', fontSize: 10 }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                              >
                                <Trash2 size={11} /> remover
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {/* legenda de roles */}
              <div style={{ marginTop: 20, background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '12px 14px', borderLeft: '2px solid var(--border-red)' }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>// permissões</div>
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <RoleTag role={key} />
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)' }}>— {cfg.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: PENDENTES ── */}
          {tab === 'pending' && (
            <div>
              {invites.length === 0 ? (
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', padding: '20px 0' }}>nenhum convite pendente.</div>
              ) : invites.map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <Mail size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text)' }}>{inv.email}</div>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>
                      enviado em {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <RoleTag role={inv.role} />
                  {isAdmin && (
                    <button onClick={() => revokeInvite(inv.id)} style={{ padding: '4px 6px', color: 'var(--text-dim)', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--ff-mono)', fontSize: 10 }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                      <X size={11} /> revogar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── TAB: CONVIDAR ── */}
          {tab === 'invite' && isAdmin && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>e-mail</label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  placeholder="email@exemplo.com"
                  style={inp}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>role</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['viewer', 'admin'].map(r => {
                    const cfg = ROLE_CONFIG[r]
                    const Icon = cfg.icon
                    return (
                      <button key={r} onClick={() => setRole(r)} style={{
                        flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                        background: role === r ? 'var(--red-dim)' : 'var(--surface)',
                        border: role === r ? '1px solid var(--border-red)' : '1px solid var(--border)',
                        transition: 'all var(--fast)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Icon size={12} style={{ color: cfg.color }} />
                          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: cfg.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cfg.label}</span>
                          {role === r && <Check size={10} style={{ color: 'var(--red)', marginLeft: 'auto' }} />}
                        </div>
                        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{cfg.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={handleInvite}
                disabled={inviting || !email.trim()}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', opacity: !email.trim() ? 0.4 : 1 }}
              >
                {inviting ? 'enviando...' : <><UserPlus size={13} /> enviar convite</>}
              </button>

              {msg && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--ff-mono)', fontSize: 11, color: msg.type === 'ok' ? '#5aab6e' : 'var(--red)', background: 'var(--surface)', padding: '10px 12px', borderRadius: 'var(--radius)', border: `1px solid ${msg.type === 'ok' ? '#5aab6e' : 'var(--border-red)'}` }}>
                  {msg.type === 'ok' ? <Check size={12} /> : <AlertCircle size={12} />}
                  {msg.text}
                </div>
              )}

              <div style={{ marginTop: 20, background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '12px 14px', borderLeft: '2px solid var(--border-red)' }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 6 }}>// como funciona</div>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.8 }}>
                  O convidado recebe um e-mail com link de acesso.<br />
                  Ao clicar, ele cria uma conta (ou faz login) e já entra na organização com o role escolhido.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}