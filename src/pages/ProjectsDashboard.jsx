import { useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { useGroups }   from '../hooks/useGroups'
import { Plus, LayoutGrid, List, FolderKanban, User, ChevronRight, Pencil } from 'lucide-react'
import ProjectModal from '../components/projects/ProjectModal'
import { useSounds } from '../hooks/useSounds'

function statusLabel(s) {
  if (s === 'active')    return { label: 'ativo',    color: '#5aab6e' }
  if (s === 'attention') return { label: 'atenção',  color: 'var(--amber)' }
  if (s === 'archived')  return { label: 'arquivado',color: 'var(--text-dim)' }
  return                        { label: 'inativo',  color: 'var(--text-dim)' }
}

function VisibilityBadge({ visibility }) {
  if (!visibility || visibility === 'org') return null
  return (
    <span style={{
      fontFamily: 'var(--ff-mono)', fontSize: 8, letterSpacing: '0.16em',
      textTransform: 'uppercase', color: 'var(--text-dim)',
      border: '1px solid var(--border)', borderRadius: 3,
      padding: '1px 5px', flexShrink: 0,
    }}>
      privado
    </span>
  )
}

function ProjectCard({ project, groupCount, onOpen, onEdit, isAdmin, view }) {
  const st = statusLabel(project.status)
  const isGrid = view === 'grid'

  return (
    <div style={{
      display: 'flex', flexDirection: isGrid ? 'column' : 'row',
      alignItems: isGrid ? 'flex-start' : 'center',
      gap: isGrid ? 14 : 0,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: isGrid ? 'var(--radius-md)' : 0,
      borderBottom: isGrid ? undefined : '1px solid var(--border)',
      padding: isGrid ? '20px 20px 16px' : '12px 20px',
      transition: 'all var(--fast)',
      position: 'relative',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-red)'; e.currentTarget.style.background = 'var(--surface)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isGrid ? 'var(--border)' : 'transparent'; e.currentTarget.style.background = 'var(--bg-card)' }}
    >
      {/* botão editar — hover, só admin */}
      {isAdmin && (
        <button
          onClick={e => { e.stopPropagation(); onEdit(project) }}
          title="Editar projeto"
          style={{
            position: 'absolute', top: 10, right: 10,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '4px 6px',
            cursor: 'pointer', color: 'var(--text-dim)',
            display: 'flex', alignItems: 'center',
            opacity: 0, transition: 'opacity var(--fast)',
          }}
          className="project-card-edit"
        >
          <Pencil size={11} />
        </button>
      )}

      {/* área clicável para entrar no projeto */}
      <button
        onClick={() => onOpen(project)}
        style={{
          display: 'flex', flexDirection: isGrid ? 'column' : 'row',
          alignItems: isGrid ? 'flex-start' : 'center',
          gap: isGrid ? 14 : 0,
          width: '100%', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', padding: 0,
        }}
      >
        {/* ícone tipo */}
        <div style={{
          width: isGrid ? 36 : 28, height: isGrid ? 36 : 28,
          borderRadius: 8, flexShrink: 0,
          background: 'var(--red-dim)', border: '1px solid var(--border-red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginRight: isGrid ? 0 : 14,
        }}>
          {project.type === 'individual'
            ? <User size={isGrid ? 16 : 13} style={{ color: 'var(--red)' }} />
            : <FolderKanban size={isGrid ? 16 : 13} style={{ color: 'var(--red)' }} />
          }
        </div>

        {/* info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isGrid ? 6 : 2 }}>
            <div style={{
              fontFamily: 'var(--ff-disp)', fontSize: isGrid ? 18 : 14,
              letterSpacing: '0.04em', color: 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {project.name}
            </div>
            <span style={{
              fontFamily: 'var(--ff-mono)', fontSize: 8, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: st.color,
              border: `1px solid ${st.color}`, borderRadius: 3,
              padding: '1px 5px', flexShrink: 0, opacity: 0.9,
            }}>
              {st.label}
            </span>
            <VisibilityBadge visibility={project.visibility} />
          </div>

          {project.description && (
            <div style={{
              fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              marginBottom: isGrid ? 10 : 0,
            }}>
              {project.description}
            </div>
          )}

          {isGrid && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                {groupCount} {project.type === 'individual' ? 'pessoa(s)' : 'grupo(s)'}
              </span>
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                {project.type === 'individual' ? '// individual' : '// equipes'}
              </span>
            </div>
          )}
        </div>

        {!isGrid && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              {groupCount} {project.type === 'individual' ? 'pessoa(s)' : 'grupo(s)'}
            </span>
            <ChevronRight size={14} style={{ color: 'var(--text-dim)' }} />
          </div>
        )}
      </button>

      <style>{`.project-card-edit { opacity: 0 } div:hover > .project-card-edit { opacity: 1 }`}</style>
    </div>
  )
}

export default function ProjectsDashboard({ org, isAdmin, onSelectProject }) {
  const sounds = useSounds()
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects(org?.id)
  const { groups } = useGroups(org?.id)

  const [view,         setView]         = useState('grid')
  const [showModal,    setShowModal]    = useState(false)
  const [editingProj,  setEditingProj]  = useState(null)
  const [search,       setSearch]       = useState('')

  function groupCount(projectId) {
    return groups.filter(g => g.project_id === projectId).length
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSaveProject(payload) {
    let result
    if (editingProj) result = await updateProject(editingProj.id, payload)
    else             result = await createProject(payload)
    if (!result?.error) { setEditingProj(null); sounds.play('success') }
    else sounds.play('error')
    return result
  }

  async function handleDeleteProject(id) {
    const result = await deleteProject(id)
    if (!result?.error) { setEditingProj(null); sounds.play('success') }
    else sounds.play('error')
    return result
  }

  function openEditModal(project) {
    setEditingProj(project)
    setShowModal(true)
  }

  if (!org) return (
    <div className="page-wrap">
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 52, color: 'var(--border-red)' }}>∅</div>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>nenhuma organização criada</div>
        {isAdmin && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>crie uma na sidebar para começar</div>}
      </div>
    </div>
  )

  return (
    <div className="page-wrap">
      {/* header */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '14px 32px 14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90, background: 'var(--header-bg)', backdropFilter: 'blur(12px)' }}>
        <div style={{ width: 44 }} className="mobile-placeholder" />
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', flex: 1 }}>
          <span style={{ color: 'var(--text-sub)' }}>{org.name}</span>
        </div>
        <div style={{ width: 44 }} />
      </header>

      {/* hero */}
      <section style={{ padding: '48px var(--content-pad) 36px', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '100%', background: 'radial-gradient(ellipse at right, var(--glow-red), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.44em', color: 'var(--red)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ display: 'inline-block', width: 18, height: 1, background: 'var(--red)' }} />
          {isAdmin ? 'visão geral' : 'meus projetos'}
        </div>
        <h1 style={{ fontFamily: 'var(--ff-disp)', fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 0.92, letterSpacing: '0.02em', color: 'var(--text)', marginBottom: 28 }}>
          PROJETOS <span style={{ color: 'var(--red)' }}>EM</span><br />TEMPO REAL
        </h1>

        {/* busca + toggle */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--red)' }}>›_</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="buscar projeto..."
              style={{ width: '100%', padding: '9px 12px 9px 32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['grid', <LayoutGrid size={13} />], ['list', <List size={13} />]].map(([v, icon]) => (
              <button key={v} onClick={() => setView(v)} data-sound-tab style={{ padding: '7px 10px', borderRadius: 'var(--radius)', background: view === v ? 'var(--red-dim)' : 'var(--surface)', color: view === v ? 'var(--text)' : 'var(--text-dim)', border: view === v ? '1px solid var(--border-red)' : '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* conteúdo */}
      <section style={{ padding: '28px var(--content-pad) 48px', flex: 1 }}>
        {loading ? (
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.2em' }}>carregando_</div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 38, color: 'var(--border-red)' }}>∅</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              {search ? 'nenhum resultado' : 'nenhum projeto ainda'}
            </div>
            {isAdmin && !search && (
              <button onClick={() => { setEditingProj(null); setShowModal(true) }} className="btn btn-primary" style={{ marginTop: 8 }}>
                <Plus size={13} /> criar primeiro projeto
              </button>
            )}
          </div>
        ) : (
          <div style={view === 'grid'
            ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }
            : { display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }
          }>
            {filtered.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                groupCount={groupCount(p.id)}
                view={view}
                isAdmin={isAdmin}
                onOpen={onSelectProject}
                onEdit={openEditModal}
              />
            ))}

            {/* card novo projeto — só admin */}
            {isAdmin && view === 'grid' && (
              <button
                onClick={() => { setEditingProj(null); setShowModal(true) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 120, borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', transition: 'all var(--fast)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-red)'; e.currentTarget.style.color = 'var(--red)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)' }}
              >
                <Plus size={20} />
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>novo projeto</span>
              </button>
            )}
          </div>
        )}

        {/* botão novo projeto em lista */}
        {isAdmin && view === 'list' && filtered.length > 0 && (
          <button
            onClick={() => { setEditingProj(null); setShowModal(true) }}
            className="btn btn-ghost"
            style={{ marginTop: 12, fontSize: 10 }}
          >
            <Plus size={12} /> novo projeto
          </button>
        )}
      </section>

      {showModal && isAdmin && (
        <ProjectModal
          project={editingProj}
          onClose={() => { setShowModal(false); setEditingProj(null) }}
          onSave={handleSaveProject}
          onDelete={editingProj ? handleDeleteProject : undefined}
        />
      )}
    </div>
  )
}
