import { useState } from 'react'
import { useGroups } from '../hooks/useGroups'
import GroupCard from '../components/groups/GroupCard'
import GroupModal from '../components/groups/GroupModal'
import NotesPanel from '../components/notes/NotesPanel'
import ReviewPanel from '../components/groups/ReviewPanel'
import { Plus, LayoutGrid, List, BarChart2, X } from 'lucide-react'
import { useSounds } from '../hooks/useSounds'

export default function Dashboard({ org, trelloToken }) {
  const { groups, loading, createGroup, updateGroup, deleteGroup } = useGroups(org?.id)
  const sounds = useSounds()
  const [showModal, setShowModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [notesGroup, setNotesGroup] = useState(null)
  const [reviewGroup, setReviewGroup] = useState(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('grid')
  const [filter, setFilter] = useState('all')
  const [searchFocused, setSearchFocused] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)

  const filtered = groups.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || g.status === filter
    return matchSearch && matchFilter
  })

  async function handleSave(payload) {
    let result
    if (editingGroup) result = await updateGroup(editingGroup.id, payload)
    else result = await createGroup(payload)
    if (!result?.error) { setEditingGroup(null); sounds.play('success') }
    else sounds.play('error')
    return result
  }

  if (!org) return (
    <div className="page-wrap">
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 52, color: 'var(--border-red)' }}>∅</div>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>nenhuma organização criada</div>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>crie uma na sidebar para começar</div>
      </div>
      <SiteFooter />
    </div>
  )

  return (
    <div className="page-wrap">
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '14px 32px 14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 90,
        background: 'var(--header-bg)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{ width: 44 }} className="mobile-placeholder" />
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', flex: 1 }}>
          ETE Cícero Dias · 2026
          <span style={{ color: 'var(--border-bright)', margin: '0 10px' }}>·</span>
          <span style={{ color: 'var(--text-sub)' }}>{org.name}</span>
        </div>
        <div style={{ width: 44 }} />
      </header>

      <section style={{ padding: '48px var(--content-pad) 36px', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '100%', background: 'radial-gradient(ellipse at right, var(--glow-red), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.44em', color: 'var(--red)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ display: 'inline-block', width: 18, height: 1, background: 'var(--red)' }} />
          painel da professora
        </div>
        <h1 style={{ fontFamily: 'var(--ff-disp)', fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 0.92, letterSpacing: '0.02em', color: 'var(--text)', marginBottom: 28 }}>
          GRUPOS <span style={{ color: 'var(--red)' }}>EM</span><br />TEMPO REAL
        </h1>
        <div className="terminal-search-wrap">
          <div className="terminal-prompt">
            ›_
            {searchFocused && <span className="terminal-cursor" />}
          </div>
          <input className="terminal-input" value={search} onChange={e => { setSearch(e.target.value); sounds.play('typing') }}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            placeholder="buscar por grupo, repositório..." autoComplete="off" spellCheck="false" />
        </div>
        <div className="terminal-meta">
          <span>›_ {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{groups.filter(g => g.status === 'active').length} ativos</span>
          <span>·</span>
          <span>api.github.com</span>
        </div>
      </section>

      <div style={{ padding: '12px var(--content-pad)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[['all','// todos'],['active','// ativos'],['attention','// atenção'],['inactive','// inativos']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilter(val)} className={`filter-btn${filter === val ? ' active' : ''}`}>{lbl}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
            <strong style={{ color: 'var(--text-muted)' }}>{filtered.length}</strong> grupos
          </span>
          <div style={{ display: 'flex', gap: 2 }}>
            {[['grid', LayoutGrid], ['list', List]].map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: 7, borderRadius: 'var(--radius)',
                background: view === v ? 'var(--surface)' : 'transparent',
                color: view === v ? 'var(--red)' : 'var(--text-dim)',
                border: '1px solid transparent',
              }}><Icon size={13} /></button>
            ))}
            <button onClick={() => setShowDashboard(true)} title="dashboard de andamento" style={{
              padding: 7, borderRadius: 'var(--radius)',
              background: 'var(--surface)', color: 'var(--text-dim)',
              border: '1px solid var(--border)',
            }}><BarChart2 size={13} /></button>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">+ adicionar grupo</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ padding: '10px var(--content-pad)', display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)', flexWrap: 'wrap' }}>
        {[
          { dot: 'var(--red)',        label: 'total',        val: groups.length },
          { dot: '#5aab6e',           label: 'ativos',       val: groups.filter(g => g.status === 'active').length },
          { dot: '#c8922a',           label: 'atenção',      val: groups.filter(g => g.status === 'attention').length },
          { dot: 'var(--text-sub)',   label: 'c/ github',    val: groups.filter(g => g.github_repo).length },
          { dot: '#a259ff',           label: 'c/ figma',     val: groups.filter(g => g.figma_url).length },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
            {s.label} <strong style={{ color: 'var(--text-sub)' }}>{s.val}</strong>
          </div>
        ))}
      </div>

      <main style={{ flex: 1, padding: '28px var(--content-pad)' }}>
        {loading ? (
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.2em' }}>carregando_</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 36, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 10 }}>NENHUM GRUPO</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.22em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 20 }}>
              {groups.length === 0 ? 'adicione repositórios para começar' : 'nenhum resultado'}
            </div>
            {groups.length === 0 && <button onClick={() => setShowModal(true)} className="btn btn-primary">+ adicionar grupo</button>}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' : '1fr',
            gap: 16,
          }}>
            {filtered.map(group => (
              <GroupCard key={group.id} group={group} trelloToken={trelloToken}
                onEdit={g => { setEditingGroup(g); setShowModal(true) }}
                onDelete={async (id) => { sounds.play('delete'); await deleteGroup(id) }}
                onOpenNotes={g => setNotesGroup(g)}
                view={view}
                onOpenReview={g => {
                  const deployUrl = g.deploy_url ||
                    (g.github_repo
                      ? `https://${g.github_repo.split('/')[0]}.github.io/${g.github_repo.split('/')[1]}`
                      : null)
                  if (deployUrl) {
                    // Abre o site com hash pra extensão detectar e ativar automaticamente
                    window.open(`${deployUrl}#atelier_group=${g.id}&atelier_name=${encodeURIComponent(g.name)}`, '_blank')
                  } else {
                    alert(`Grupo "${g.name}" não tem URL de deploy cadastrada.\nAdicione o repositório GitHub no grupo para habilitar.`)
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>

      <SiteFooter org={org} />

      {showModal && (
        <GroupModal group={editingGroup} trelloToken={trelloToken}
          trelloWorkspaceId={org?.trello_workspace_id}
          onClose={() => { setShowModal(false); setEditingGroup(null) }}
          onSave={handleSave}
        />
      )}
      {notesGroup && <NotesPanel group={notesGroup} orgId={org?.id} onClose={() => setNotesGroup(null)} />}
      {/* [EXTENSÃO] ReviewPanel comentado — substituído pela extensão Chrome atelier-sh-extension
      {reviewGroup && <ReviewPanel group={reviewGroup} orgId={org?.id} onClose={() => setReviewGroup(null)} />}
      */}
      {showDashboard && <DashboardPanel groups={groups} onClose={() => setShowDashboard(false)} />}
    </div>
  )
}

// ── DASHBOARD DE ANDAMENTO ──────────────────────────────────────────────────
function DashboardPanel({ groups, onClose }) {
  const parseMaybeJson = (val, fallback = []) => {
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return fallback }
  }

  const total = groups.length
  const active = groups.filter(g => g.status === 'active').length
  const attention = groups.filter(g => g.status === 'attention').length
  const inactive = groups.filter(g => g.status === 'inactive').length
  const withGH = groups.filter(g => g.github_repo).length
  const withTrello = groups.filter(g => g.trello_board_id).length
  const withFigma = groups.filter(g => g.figma_url).length

  // Etapas
  const stages = {}
  groups.forEach(g => {
    const s = g.stage || '— sem etapa —'
    stages[s] = (stages[s] || 0) + 1
  })

  // Tags mais comuns
  const tagCount = {}
  groups.forEach(g => {
    parseMaybeJson(g.tags).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1 })
  })
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Integrantes totais
  const totalMembers = groups.reduce((acc, g) => acc + parseMaybeJson(g.members).length, 0)

  function Bar({ val, max, color }) {
    const pct = max > 0 ? (val / max) * 100 : 0
    return (
      <div style={{ flex: 1, height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, letterSpacing: '0.05em' }}>DASHBOARD DE ANDAMENTO</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.3em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>// {total} grupos</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4, cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'total grupos', val: total, color: 'var(--red)' },
              { label: 'ativos', val: active, color: '#5aab6e' },
              { label: 'atenção', val: attention, color: '#c8922a' },
              { label: 'inativos', val: inactive, color: 'var(--text-dim)' },
              { label: 'integrantes', val: totalMembers, color: 'var(--text-sub)' },
              { label: 'c/ github', val: withGH, color: 'var(--text-muted)' },
              { label: 'c/ trello', val: withTrello, color: '#0079bf' },
              { label: 'c/ figma', val: withFigma, color: '#a259ff' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', borderTop: `3px solid ${k.color}` }}>
                <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 28, color: k.color, lineHeight: 1 }}>{k.val}</div>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Status gráfico */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 12 }}>// distribuição de status</div>
            {total === 0 ? <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>sem dados</div> : (
              <div style={{ display: 'flex', gap: 6, height: 32, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {active > 0 && <div style={{ flex: active, background: '#5aab6e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-mono)', fontSize: 10, color: '#fff', fontWeight: 600 }}>{Math.round(active/total*100)}%</div>}
                {attention > 0 && <div style={{ flex: attention, background: '#c8922a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-mono)', fontSize: 10, color: '#fff', fontWeight: 600 }}>{Math.round(attention/total*100)}%</div>}
                {inactive > 0 && <div style={{ flex: inactive, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{Math.round(inactive/total*100)}%</div>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {[['#5aab6e','ativos'], ['#c8922a','atenção'], ['var(--border)','inativos']].map(([c, l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} /> {l}
                </span>
              ))}
            </div>
          </div>

          {/* Etapas */}
          {Object.keys(stages).length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 12 }}>// etapas dos projetos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(stages).sort((a,b)=>b[1]-a[1]).map(([stage, count]) => (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', width: 140, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stage}</div>
                    <Bar val={count} max={total} color='var(--red)' />
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-sub)', width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {topTags.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 12 }}>// tags mais usadas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topTags.map(([tag, count]) => (
                  <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', width: 140, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tag}</div>
                    <Bar val={count} max={topTags[0]?.[1] || 1} color='#a259ff' />
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-sub)', width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de grupos com integrantes */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 12 }}>// grupos detalhado</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {groups.map(g => {
                const mbs = parseMaybeJson(g.members)
                const tgs = parseMaybeJson(g.tags)
                const statusColor = g.status === 'active' ? '#5aab6e' : g.status === 'attention' ? '#c8922a' : 'var(--text-dim)'
                return (
                  <div key={g.id} style={{ padding: '8px 10px', borderRadius: 'var(--radius)', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-sub)' }}>{g.name}</span>
                      </div>
                      {g.stage && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{g.stage}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {mbs.length > 0 && <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)' }}>👥 {mbs.length}</span>}
                      {tgs.slice(0,3).map(t => (
                        <span key={t} style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, padding: '1px 5px', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', background: 'rgba(74,21,21,0.1)' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SiteFooter({ org }) {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)', padding: '14px var(--content-pad)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--bg-alt)', flexWrap: 'wrap', gap: 8,
    }}>
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.16em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
        ETE Cícero Dias · <span style={{ color: 'var(--red)' }}>Profa. Samara Silvia Sabino</span>
      </div>
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.16em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
        dados via <span style={{ color: 'var(--red)' }}>api.github.com</span> · atelier<span style={{ color: 'var(--red)' }}>.sh</span>
      </div>
    </footer>
  )
}
