import { useState } from 'react'
import { useGroups } from '../hooks/useGroups'
import { ChevronDown, Users, User } from 'lucide-react'
import AvaliacaoTab from '../components/groups/AvaliacaoTab'

export default function Avaliacoes({ org, projectId }) {
  const { groups, loading } = useGroups(org?.id, projectId)
  const [grupoId, setGrupoId] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const grupo = groups.find(g => g.id === grupoId) || null

  const parseMaybeJson = (val, fallback = []) => {
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return fallback }
  }

  const statusCor = (s) => s === 'active' ? '#5aab6e' : s === 'attention' ? '#c8922a' : 'var(--border)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.06em', color: 'var(--text)' }}>AVALIAÇÕES</div>
        {org && <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>· {org.name}</span>}
        <div style={{ flex: 1 }} />

        {/* Seletor de grupo */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setDropdownOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 'var(--radius)', border: `1px solid ${grupoId ? 'var(--border-red)' : 'var(--border)'}`, background: grupoId ? 'var(--red-dim)' : 'var(--surface)', fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.08em', color: grupoId ? 'var(--red)' : 'var(--text-muted)', cursor: 'pointer' }}>
            {loading ? 'carregando_'
              : grupo ? <><span style={{ width: 7, height: 7, borderRadius: '50%', background: statusCor(grupo.status), display: 'inline-block' }} /> {grupo.name}</>
              : '// selecionar grupo'
            }
            <ChevronDown size={12} />
          </button>

          {dropdownOpen && (
            <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 400, background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: 240, padding: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.3em', color: 'var(--text-dim)', textTransform: 'uppercase', padding: '4px 8px 8px' }}>grupos</div>
              {groups.map(g => (
                <button key={g.id} onClick={() => { setGrupoId(g.id); setDropdownOpen(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius)', textAlign: 'left', fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.06em', color: g.id === grupoId ? 'var(--red)' : 'var(--text-sub)', background: g.id === grupoId ? 'var(--red-dim)' : 'transparent', border: g.id === grupoId ? '1px solid var(--border-red)' : '1px solid transparent', cursor: 'pointer' }}
                  onMouseEnter={e => { if (g.id !== grupoId) e.currentTarget.style.background = 'var(--surface)' }}
                  onMouseLeave={e => { if (g.id !== grupoId) e.currentTarget.style.background = 'transparent' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusCor(g.status), flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                  {parseMaybeJson(g.members).length > 0 && (
                    <span style={{ fontSize: 9, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Users size={9} /> {parseMaybeJson(g.members).length}
                    </span>
                  )}
                </button>
              ))}
              {groups.length === 0 && !loading && (
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '6px 10px' }}>nenhum grupo encontrado</div>
              )}
            </div>
          )}
        </div>

        {grupo && (
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <User size={11} /> {parseMaybeJson(grupo.members).length} integrantes
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
        {!grupoId ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: 'var(--ff-mono)' }}>
            <div style={{ fontSize: 32, color: 'var(--text-dim)', opacity: 0.3 }}>◈</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>selecione um grupo para avaliar</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', opacity: 0.6 }}>use o seletor acima para escolher o grupo</div>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <AvaliacaoTab key={grupo.id} group={{ ...grupo, org_id: grupo.org_id || org?.id }} />
          </div>
        )}
      </div>

      {dropdownOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 399 }} onClick={() => setDropdownOpen(false)} />}
    </div>
  )
}