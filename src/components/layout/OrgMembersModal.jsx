import { useState, useCallback } from 'react'
import { X, UserMinus, Mail, Trash2, AlertCircle, RefreshCw, ChevronDown, ChevronRight, Shield, Eye, Pencil, Zap, Layers, Copy, CheckCircle2 } from 'lucide-react'
import { useOrgMembers } from '../../hooks/useOrgMembers'
import { useMemberPermissions } from '../../hooks/useMemberPermissions'
import { useGroups } from '../../hooks/useGroups'

// ── constantes ───────────────────────────────────────────────────────────────

const ROLES = [
  { val: 'viewer', label: 'viewer',  desc: 'só lê' },
  { val: 'member', label: 'member',  desc: 'edita grupos' },
  { val: 'admin',  label: 'admin',   desc: 'gerencia tudo' },
]

// ── subcomponente: permissões de um membro por grupo ─────────────────────────

function MemberPermissionsPanel({ member, orgId, groups, perms, setPermission, removePermission }) {
  const mono = { fontFamily: 'var(--ff-mono)' }
  const userId = member.user_id

  function getFlag(groupId, integration, flag) {
    const p = perms.find(
      p => p.user_id === userId && p.resource_id === groupId &&
           (p.integration === integration || p.integration === 'all')
    )
    return p?.[flag] ?? false
  }

  async function toggle(groupId, integration, flag, currentVal) {
    await setPermission(userId, 'group', groupId, integration, { [flag]: !currentVal })
  }

  if (groups.length === 0) return (
    <div style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', padding: '10px 0', letterSpacing: '0.1em' }}>
      nenhum grupo na organização
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* cabeçalho da tabela */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px', gap: 4, padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ ...mono, fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>grupo</span>
        <span style={{ ...mono, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-dim)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Eye size={9} /> ver
        </span>
        <span style={{ ...mono, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-dim)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Pencil size={9} /> editar
        </span>
        <span style={{ ...mono, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-dim)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Zap size={9} /> integr.
        </span>
      </div>

      {groups.map(g => {
        const canView      = getFlag(g.id, 'all', 'can_view')
        const canEdit      = getFlag(g.id, 'all', 'can_edit')
        const canIntegrate = getFlag(g.id, 'all', 'can_integrate')

        return (
          <div key={g.id} style={{
            display: 'grid', gridTemplateColumns: '1fr 70px 70px 70px', gap: 4,
            padding: '7px 8px', borderRadius: 'var(--radius)',
            background: 'var(--surface)',
            alignItems: 'center',
          }}>
            {/* nome do grupo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: g.color || 'var(--red)', flexShrink: 0 }} />
              <span style={{ ...mono, fontSize: 10, color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {g.name}
              </span>
            </div>

            {/* toggles */}
            {[
              { flag: 'can_view', val: canView },
              { flag: 'can_edit', val: canEdit },
              { flag: 'can_integrate', val: canIntegrate },
            ].map(({ flag, val }) => (
              <div key={flag} style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => toggle(g.id, 'all', flag, val)}
                  style={{
                    width: 28, height: 16, borderRadius: 8, cursor: 'pointer',
                    border: 'none', position: 'relative',
                    background: val ? 'var(--red)' : 'var(--border)',
                    transition: 'background var(--fast)',
                  }}
                  title={val ? 'desativar' : 'ativar'}
                >
                  <span style={{
                    position: 'absolute', top: 2, width: 12, height: 12, borderRadius: '50%',
                    background: '#fff', transition: 'left var(--fast)',
                    left: val ? 14 : 2,
                  }} />
                </button>
              </div>
            ))}
          </div>
        )
      })}

      {/* integração específica GitHub/Trello */}
      <div style={{ marginTop: 8, padding: '8px 8px 0', borderTop: '1px solid var(--border)' }}>
        <div style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
          integração específica por grupo
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {groups.map(g => {
            const ghIntegrate = perms.find(p => p.user_id === userId && p.resource_id === g.id && p.integration === 'github')?.can_integrate ?? false
            const trIntegrate = perms.find(p => p.user_id === userId && p.resource_id === g.id && p.integration === 'trello')?.can_integrate ?? false

            return (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
                <span style={{ ...mono, fontSize: 9, color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.name}
                </span>
                <IntegrationBadge label="github" active={ghIntegrate} onToggle={() => setPermission(userId, 'group', g.id, 'github', { can_integrate: !ghIntegrate })} />
                <IntegrationBadge label="trello" active={trIntegrate} onToggle={() => setPermission(userId, 'group', g.id, 'trello', { can_integrate: !trIntegrate })} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function IntegrationBadge({ label, active, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        ...{ fontFamily: 'var(--ff-mono)' }, fontSize: 9, letterSpacing: '0.1em',
        padding: '2px 7px', borderRadius: 'var(--radius)',
        border: active ? '1px solid var(--border-red)' : '1px solid var(--border)',
        background: active ? 'var(--red-dim)' : 'transparent',
        color: active ? 'var(--red)' : 'var(--text-dim)',
        cursor: 'pointer', transition: 'all var(--fast)', textTransform: 'uppercase',
      }}
    >
      {label}
    </button>
  )
}

// ── linha de membro ──────────────────────────────────────────────────────────

function MemberRow({ member, isAdmin, orgId, groups, perms, setPermission, removePermission, updateRole, onConfirmRemove }) {
  const [expanded, setExpanded] = useState(false)
  const mono = { fontFamily: 'var(--ff-mono)' }
  const avatarLetter = (member.profiles?.name || member.user_id || '?')[0].toUpperCase()

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      {/* linha principal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', gap: 8 }}>
        {/* avatar + info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'var(--red-dim)', border: '1px solid var(--border-red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...mono, fontSize: 12, color: 'var(--red)',
          }}>
            {member.profiles?.avatar
              ? <img src={member.profiles.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : avatarLetter}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...mono, fontSize: 11, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {member.profiles?.name || '(sem nome)'}
            </div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {member.role}
            </div>
          </div>
        </div>

        {/* controles — só admin */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            {/* expand permissões */}
            <button
              onClick={() => setExpanded(e => !e)}
              title="permissões por grupo"
              style={{
                background: expanded ? 'var(--red-dim)' : 'none',
                border: expanded ? '1px solid var(--border-red)' : '1px solid transparent',
                cursor: 'pointer', color: expanded ? 'var(--red)' : 'var(--text-dim)',
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 7px', borderRadius: 'var(--radius)',
                ...mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                transition: 'all var(--fast)',
              }}
            >
              <Shield size={11} /> permissões
              {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>

            {/* role select */}
            <select
              value={member.role}
              onChange={e => updateRole(member.id, e.target.value)}
              style={{ ...mono, fontSize: 10, background: 'var(--bg-alt)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 6px', cursor: 'pointer' }}
            >
              {ROLES.map(r => <option key={r.val} value={r.val}>{r.val}</option>)}
            </select>

            {/* remover */}
            <button
              onClick={() => onConfirmRemove(member)}
              title="Remover membro"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', padding: 2, transition: 'color var(--fast)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              <UserMinus size={14} />
            </button>
          </div>
        )}
      </div>

      {/* painel de permissões expandido */}
      {expanded && isAdmin && (
        <div style={{
          margin: '0 0 12px 40px', padding: '12px',
          background: 'var(--bg-alt)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}>
          <MemberPermissionsPanel
            member={member}
            orgId={orgId}
            groups={groups}
            perms={perms}
            setPermission={setPermission}
            removePermission={removePermission}
          />
        </div>
      )}
    </div>
  )
}

// ── modal principal ──────────────────────────────────────────────────────────

export default function OrgMembersModal({ org, onClose, initialTab = 'members', forceAdmin = false }) {
  const orgId = org?.id
  const { members, invites, loading, error, isAdmin: isAdminMember, invite, createInviteLink, revokeInvite, updateRole, removeMember, refresh } = useOrgMembers(orgId)
  const { perms, setPermission, removePermission } = useMemberPermissions(orgId)
  const { groups } = useGroups(orgId)

  // forceAdmin: owner da org que não está em org_members ainda
  const isAdmin = forceAdmin || isAdminMember

  const [tab,        setTab]        = useState(initialTab)  // 'members' | 'invites' | 'invite'
  const [inviteMode, setInviteMode] = useState('link')      // 'email' | 'link'
  const [email,      setEmail]      = useState('')
  const [role,       setRole]       = useState('viewer')
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState(null)
  const [toRemove,   setToRemove]   = useState(null)
  const [copiedId,   setCopiedId]   = useState(null)

  const mono = { fontFamily: 'var(--ff-mono)' }

  function buildLink(token) {
    return `${window.location.origin}/invite?token=${token}`
  }

  async function copyLink(inv) {
    const url = buildLink(inv.token)
    await navigator.clipboard.writeText(url)
    setCopiedId(inv.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleInviteByEmail() {
    if (!email.trim()) return
    setSaving(true); setErr(null)
    const { error } = await invite(email, role)
    if (error) setErr(error.message)
    else { setEmail(''); setTab('invites') }
    setSaving(false)
  }

  async function handleInviteByLink() {
    setSaving(true); setErr(null)
    const { data, error } = await createInviteLink(role)
    if (error) setErr(error.message)
    else if (data) {
      await copyLink(data)
      setTab('invites')
    }
    setSaving(false)
  }


  async function handleConfirmRemove() {
    if (!toRemove) return
    await removeMember(toRemove.id)
    setToRemove(null)
  }

  const TAB_STYLE = (active) => ({
    ...mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
    padding: '8px 16px', border: 'none', cursor: 'pointer',
    background: active ? 'var(--red-dim)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-dim)',
    borderBottom: active ? '2px solid var(--red)' : '2px solid transparent',
    transition: 'all var(--fast)',
  })

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 580, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ ...mono, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              membros
            </div>
            {org?.name && (
              <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 15, letterSpacing: '0.08em', color: 'var(--text)', marginTop: 1 }}>
                {org.name}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
            <X size={16} />
          </button>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={() => setTab('members')} data-sound-tab style={TAB_STYLE(tab === 'members')}>
            membros ({members.length})
          </button>
          <button onClick={() => setTab('invites')} data-sound-tab style={TAB_STYLE(tab === 'invites')}>
            convites {invites.length > 0 && `(${invites.length})`}
          </button>
          {isAdmin && (
            <button onClick={() => setTab('invite')} data-sound-tab style={TAB_STYLE(tab === 'invite')}>
              + convidar
            </button>
          )}
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {loading && (
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.15em' }}>carregando_</div>
          )}

          {!loading && error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0', textAlign: 'center' }}>
              <AlertCircle size={20} color="var(--red)" />
              <div style={{ ...mono, fontSize: 11, color: 'var(--text-dim)' }}>{error}</div>
              <button onClick={refresh} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} /> tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* ── TAB: MEMBROS ── */}
              {tab === 'members' && (
                <div>
                  {members.length === 0 ? (
                    <div style={{ ...mono, fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em', padding: '24px 0', textAlign: 'center' }}>
                      nenhum membro ainda
                    </div>
                  ) : members.map(m => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      isAdmin={isAdmin}
                      orgId={orgId}
                      groups={groups}
                      perms={perms}
                      setPermission={setPermission}
                      removePermission={removePermission}
                      updateRole={updateRole}
                      onConfirmRemove={setToRemove}
                    />
                  ))}
                </div>
              )}

              {/* ── TAB: CONVITES ── */}
              {tab === 'invites' && (
                <div>
                  {invites.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '32px 0', textAlign: 'center' }}>
                      <div style={{ ...mono, fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                        nenhum convite pendente
                      </div>
                      {isAdmin && (
                        <button onClick={() => setTab('invite')} className="btn btn-primary" style={{ fontSize: 10, marginTop: 4 }}>
                          + criar convite
                        </button>
                      )}
                    </div>
                  ) : invites.map(inv => {
                    const isLink = inv.email?.startsWith('link-')
                    const link   = buildLink(inv.token)
                    const copied = copiedId === inv.id
                    return (
                      <div key={inv.id} style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ ...mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
                                padding: '2px 6px', borderRadius: 'var(--radius)',
                                background: isLink ? 'var(--red-dim)' : 'var(--surface)',
                                color: isLink ? 'var(--red)' : 'var(--text-dim)',
                                border: `1px solid ${isLink ? 'var(--border-red)' : 'var(--border)'}`,
                              }}>
                                {isLink ? '🔗 link' : '✉ e-mail'}
                              </span>
                              <span style={{ ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                                padding: '2px 6px', borderRadius: 'var(--radius)',
                                background: 'var(--surface)', color: 'var(--text-muted)',
                                border: '1px solid var(--border)',
                              }}>
                                {inv.role}
                              </span>
                              <span style={{ ...mono, fontSize: 9, color: 'var(--text-dim)' }}>
                                expira {new Date(inv.expires_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            {!isLink && (
                              <div style={{ ...mono, fontSize: 11, color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {inv.email}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {/* copiar link */}
                            <button
                              onClick={() => copyLink(inv)}
                              title="Copiar link de convite"
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                ...mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                                padding: '4px 8px', borderRadius: 'var(--radius)', cursor: 'pointer',
                                border: copied ? '1px solid #5aab6e' : '1px solid var(--border)',
                                background: copied ? 'rgba(90,171,110,0.1)' : 'var(--surface)',
                                color: copied ? '#5aab6e' : 'var(--text-muted)',
                                transition: 'all var(--fast)',
                              }}
                            >
                              {copied ? <><CheckCircle2 size={11} /> copiado!</> : <><Copy size={11} /> copiar link</>}
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => revokeInvite(inv.id)}
                                title="Revogar convite"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', padding: 4, transition: 'color var(--fast)' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* preview do link */}
                        <div style={{
                          marginTop: 6, padding: '6px 10px',
                          background: 'var(--bg-alt)', borderRadius: 'var(--radius)',
                          border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ ...mono, fontSize: 9, color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {link}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── TAB: CONVIDAR ── */}
              {tab === 'invite' && isAdmin && (
                <div>
                  {/* toggle modo */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                    {[
                      { val: 'link',  label: '🔗 gerar link',    sub: 'qualquer pessoa com o link entra' },
                      { val: 'email', label: '✉ por e-mail',     sub: 'convite enviado por e-mail' },
                    ].map(m => (
                      <button key={m.val} onClick={() => setInviteMode(m.val)} style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
                        padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        border: inviteMode === m.val ? '1px solid var(--border-red)' : '1px solid var(--border)',
                        background: inviteMode === m.val ? 'var(--red-dim)' : 'var(--surface)',
                        transition: 'all var(--fast)',
                      }}>
                        <span style={{ ...mono, fontSize: 10, letterSpacing: '0.1em', color: inviteMode === m.val ? 'var(--text)' : 'var(--text-muted)' }}>{m.label}</span>
                        <span style={{ ...mono, fontSize: 9, color: 'var(--text-dim)' }}>{m.sub}</span>
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* role */}
                    <div>
                      <label style={{ display: 'block', ...mono, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>role</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {ROLES.map(r => (
                          <button key={r.val} onClick={() => setRole(r.val)} style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                            padding: '9px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                            border: role === r.val ? '1px solid var(--border-red)' : '1px solid var(--border)',
                            background: role === r.val ? 'var(--red-dim)' : 'var(--surface)',
                            transition: 'all var(--fast)',
                          }}>
                            <span style={{ ...mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: role === r.val ? 'var(--text)' : 'var(--text-muted)' }}>{r.label}</span>
                            <span style={{ ...mono, fontSize: 9, color: 'var(--text-dim)' }}>{r.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* e-mail (só no modo e-mail) */}
                    {inviteMode === 'email' && (
                      <div>
                        <label style={{ display: 'block', ...mono, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>e-mail</label>
                        <input
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleInviteByEmail()}
                          placeholder="email@exemplo.com"
                          type="email"
                          autoFocus
                          style={{ width: '100%', ...mono, fontSize: 11, background: 'var(--bg-alt)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}

                    {err && (
                      <div style={{ ...mono, fontSize: 11, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={12} /> {err}
                      </div>
                    )}

                    <button
                      onClick={inviteMode === 'link' ? handleInviteByLink : handleInviteByEmail}
                      disabled={saving || (inviteMode === 'email' && !email.trim())}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}
                    >
                      {saving
                        ? 'gerando...'
                        : inviteMode === 'link'
                          ? <><Copy size={13} /> gerar e copiar link</>
                          : <><Mail size={13} /> enviar convite</>
                      }
                    </button>

                    {inviteMode === 'link' && (
                      <div style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.6, padding: '8px 10px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        O link gerado vai aparecer na aba <strong style={{ color: 'var(--text-muted)' }}>convites</strong> e já será copiado automaticamente. Expira em 7 dias.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      </div>

      {/* confirmação de remoção */}
      {toRemove && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', padding: 24, maxWidth: 360, width: '100%' }}>
            <div style={{ ...mono, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 10 }}>confirmar remoção</div>
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-sub)', marginBottom: 20 }}>
              Remover <strong>{toRemove.profiles?.name || 'este membro'}</strong> da organização?
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setToRemove(null)} className="btn btn-ghost">cancelar</button>
              <button onClick={handleConfirmRemove} className="btn btn-primary" style={{ background: 'var(--red)' }}>remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}