import { useState } from 'react'
import { useGroups }  from '../hooks/useGroups'
import { useAuth }    from '../hooks/useAuth'
import GroupCard      from '../components/groups/GroupCard'
import GroupModal     from '../components/groups/GroupModal'
import NotesPanel     from '../components/notes/NotesPanel'
import { Plus, LayoutGrid, List, X, ChevronLeft, BarChart2 } from 'lucide-react'
import { useSounds }  from '../hooks/useSounds'

export default function GroupsDashboard({ org, project, projectId, role, isAdmin, trelloToken, onBack }) {
  const { user }    = useAuth()
  const { groups, loading, createGroup, updateGroup, deleteGroup } = useGroups(org?.id, projectId)
  const sounds      = useSounds()
  const [showModal,     setShowModal]     = useState(false)
  const [editingGroup,  setEditingGroup]  = useState(null)
  const [notesGroup,    setNotesGroup]    = useState(null)
  const [search,        setSearch]        = useState('')
  const [view,          setView]          = useState('grid')
  const [filter,        setFilter]        = useState('all')
  const [searchFocused, setSearchFocused] = useState(false)

  // visibilidade por role
  const visibleGroups = isAdmin
    ? groups
    : groups.filter(g => {
        const members = Array.isArray(g.members) ? g.members : (typeof g.members === 'string' ? JSON.parse(g.members || '[]') : [])
        return members.some(m => m.user_id === user?.id || m.email === user?.email)
      })

  const filtered = visibleGroups.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.github_repo?.toLowerCase().includes(search.toLowerCase()) ||
      g.description?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || g.status === filter
    return matchSearch && matchFilter
  })

  // contadores
  const total     = visibleGroups.length
  const ativos    = visibleGroups.filter(g => g.status === 'active').length
  const atencao   = visibleGroups.filter(g => g.status === 'attention').length
  const comGithub = visibleGroups.filter(g => g.github_repo).length
  const comFigma  = visibleGroups.filter(g => g.figma_url || g.figma_file_id).length

  async function handleSave(payload) {
    let result
    if (editingGroup) result = await updateGroup(editingGroup.id, payload)
    else              result = await createGroup({ ...payload, project_id: projectId })
    if (!result?.error) { setEditingGroup(null); sounds.play('success') }
    else sounds.play('error')
    return result
  }

  if (!org) return null

  return (
    <div className="page-wrap">
      {/* header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '14px 32px 14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 90,
        background: 'var(--header-bg)', backdropFilter: 'blur(12px)',
      }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
          <ChevronLeft size={13} /> projetos
        </button>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', flex: 1 }}>
          Gestão de Projetos
          <span style={{ color: 'var(--border-bright)', margin: '0 10px' }}>·</span>
          <span style={{ color: 'var(--text-sub)' }}>{org.name}</span>
          {project && <><span style={{ color: 'var(--border-bright)', margin: '0 8px' }}>·</span><span style={{ color: 'var(--text-dim)' }}>{project.name}</span></>}
        </div>
        <div style={{ width: 80 }} />
      </header>

      {/* hero */}
      <section style={{ padding: '48px var(--content-pad) 36px', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '100%', background: 'radial-gradient(ellipse at right, var(--glow-red), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.44em', color: 'var(--red)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ display: 'inline-block', width: 18, height: 1, background: 'var(--red)' }} />
          {isAdmin ? 'painel da professora' : 'meu projeto'}
        </div>
        <h1 style={{ fontFamily: 'var(--ff-disp)', fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 0.92, letterSpacing: '0.02em', color: 'var(--text)', marginBottom: 28 }}>
          GRUPOS <span style={{ color: 'var(--red)' }}>EM</span><br />TEMPO REAL
        </h1>

        {/* barra de busca estilo terminal */}
        <div className="terminal-search-wrap">
          <div className="terminal-prompt">
            ›_
            {searchFocused && <span className="terminal-cursor" />}
          </div>
          <input
            className="terminal-input"
            value={search}
            onChange={e => { setSearch(e.target.value); sounds.play('typing') }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="buscar por grupo, repositório..."
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        <div className="terminal-meta">
          <span>›_ {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{ativos} ativos</span>
          <span>·</span>
          <span>api.github.com</span>
        </div>
      </section>

      {/* barra de filtros + ações */}
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
          </div>
          {isAdmin && (
            <button onClick={() => { setEditingGroup(null); setShowModal(true) }} className="btn btn-primary">
              + adicionar grupo
            </button>
          )}
        </div>
      </div>

      {/* stats bar */}
      <div style={{ padding: '10px var(--content-pad)', display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', background: 'var(--bg-alt)', flexWrap: 'wrap' }}>
        {[
          { dot: 'var(--red)',      label: 'total',     val: total },
          { dot: '#5aab6e',         label: 'ativos',    val: ativos },
          { dot: '#c8922a',         label: 'atenção',   val: atencao },
          { dot: 'var(--text-sub)', label: 'c/ github', val: comGithub },
          { dot: '#a259ff',         label: 'c/ figma',  val: comFigma },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
            {s.label} <strong style={{ color: 'var(--text-sub)' }}>{s.val}</strong>
          </div>
        ))}
      </div>

      {/* conteúdo */}
      <main style={{ flex: 1, padding: '28px var(--content-pad)' }}>
        {loading ? (
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.2em' }}>carregando_</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 36, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 10 }}>NENHUM GRUPO</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.22em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 20 }}>
              {isAdmin
                ? (search ? 'nenhum resultado' : 'adicione grupos para começar')
                : 'você ainda não foi atribuído a um grupo'}
            </div>
            {isAdmin && !search && (
              <button onClick={() => setShowModal(true)} className="btn btn-primary">+ adicionar grupo</button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' : '1fr',
            gap: 16,
          }}>
            {filtered.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                trelloToken={trelloToken}
                view={view}
                onEdit={isAdmin ? (g) => { setEditingGroup(g); setShowModal(true) } : null}
                onDelete={isAdmin ? async (id) => { sounds.play('delete'); await deleteGroup(id) } : null}
                onOpenNotes={(g) => setNotesGroup(g)}
                onOpenReview={null}
              />
            ))}
          </div>
        )}
      </main>

      <SiteFooter org={org} />

      {showModal && isAdmin && (
        <GroupModal
          group={editingGroup}
          trelloToken={trelloToken}
          trelloWorkspaceId={org?.trello_workspace_id}
          onClose={() => { setShowModal(false); setEditingGroup(null) }}
          onSave={handleSave}
        />
      )}

      {notesGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 300, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}
          onClick={e => e.target === e.currentTarget && setNotesGroup(null)}>
          <div style={{ width: '100%', maxWidth: 520, background: 'var(--bg)', boxShadow: '-8px 0 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 16, letterSpacing: '0.06em' }}>{notesGroup.name}</div>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>// anotações</div>
              </div>
              <button onClick={() => setNotesGroup(null)} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <NotesPanel group={notesGroup} orgId={org?.id} isAdmin={isAdmin} />
            </div>
          </div>
        </div>
      )}
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
        Gestão de Projetos · <span style={{ color: 'var(--red)' }}>samarasilvia.dev@gmail.com</span>
      </div>
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.16em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
        dados via <span style={{ color: 'var(--red)' }}>api.github.com</span> · atelier<span style={{ color: 'var(--red)' }}>.sh</span>
      </div>
    </footer>
  )
}