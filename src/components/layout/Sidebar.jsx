import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useOrgs } from '../../hooks/useOrgs'
import { useTheme } from '../../hooks/useTheme.jsx'
import { useProjects } from '../../hooks/useProjects'
import { useGroups } from '../../hooks/useGroups'
import { useRole } from '../../hooks/useRole'
import {
  LayoutDashboard, FileText, Settings, LogOut, Plus, ChevronLeft, ChevronRight,
  Sun, Moon, Menu, X, Check, CircleUser, Pencil, FolderKanban, ExternalLink,
  Users, ChevronDown, ChevronUp
} from 'lucide-react'
import OrgModal from './OrgModal'
import OrgMembersModal from './OrgMembersModal'
import ProjectModal from '../projects/ProjectModal'

const EXTENSION_URL = 'https://chrome.google.com/webstore/detail/atelier-sh'

export default function Sidebar({ currentOrgId, setCurrentOrgId, currentProjectId, setCurrentProjectId, collapsed, setCollapsed }) {
  const { user, signOut }                         = useAuth()
  const { orgs, createOrg, updateOrg, deleteOrg } = useOrgs()
  const { theme, toggleTheme }                    = useTheme()
  const currentOrg = orgs.find(o => o.id === currentOrgId) || orgs[0]
  const { role, isAdmin }                         = useRole(currentOrgId)
  const { projects, createProject, updateProject } = useProjects(currentOrgId)
  const { groups }                                = useGroups(currentOrgId, currentProjectId)
  const navigate  = useNavigate()
  const location  = useLocation()
  const isDark    = !theme.endsWith('-light')

  const [showOrgModal,      setShowOrgModal]      = useState(false)
  const [showMembers,       setShowMembers]        = useState(false)
  const [editingOrg,        setEditingOrg]         = useState(null)
  const [showOrgMenu,       setShowOrgMenu]        = useState(false)
  const [showProjectModal,  setShowProjectModal]   = useState(false)
  const [editingProject,    setEditingProject]     = useState(null)
  const [mobileOpen,        setMobileOpen]         = useState(false)
  const [orgSaved,          setOrgSaved]           = useState(false)
  const [showGroupsPreview, setShowGroupsPreview]  = useState(true)

  function isActive(p) { return p === '/' ? location.pathname === '/' : location.pathname.startsWith(p) }

  function navTo(path) {
    navigate(path)
    setMobileOpen(false)
  }

  function selectProject(id) {
    setCurrentProjectId(id)
    if (location.pathname !== '/') navigate('/')
    setMobileOpen(false)
  }

  function selectOrg(id) {
    setCurrentOrgId(id)
    setCurrentProjectId(null)
    setOrgSaved(true)
    setTimeout(() => { setShowOrgMenu(false); setOrgSaved(false) }, 1000)
  }

  async function handleSaveProject(payload) {
    let result
    if (editingProject) result = await updateProject(editingProject.id, payload)
    else result = await createProject(payload)
    return result
  }

  const col = collapsed

  const navBtn = (active) => ({
    display: 'flex', alignItems: 'center',
    gap: col ? 0 : 10,
    justifyContent: col ? 'center' : 'flex-start',
    width: '100%', padding: col ? '11px 0' : '9px 12px',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--ff-mono)', fontSize: 11,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    background: active ? 'var(--red-dim)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-muted)',
    border: active ? '1px solid var(--border-red)' : '1px solid transparent',
    transition: 'all var(--fast) var(--ease)',
  })

  const SidebarContent = ({ isMobile = false }) => {
    const c = col && !isMobile
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Logo */}
        <div style={{ padding: c ? '16px 0' : '18px 18px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: c ? 'center' : 'space-between', minHeight: 62 }}>
          {c ? (
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 18, color: 'var(--red)' }}>⬡</span>
          ) : (
            <>
              <div>
                <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 22, letterSpacing: '0.08em', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--red)', marginRight: 2 }}>⬡</span>
                  <span style={{ color: 'var(--text)' }}>ATELIER</span>
                  <span style={{ color: 'var(--red)' }}>.SH</span>
                </div>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>gestão de projetos</div>
              </div>
              {isMobile && <button onClick={() => setMobileOpen(false)} style={{ color: 'var(--text-muted)', padding: 4 }}><X size={18} /></button>}
            </>
          )}
        </div>

        {/* ── Org selector ── */}
        <div style={{ padding: c ? '8px 4px' : '8px 10px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          {c ? (
            <button
              onClick={() => setShowOrgMenu(v => !v)}
              title={`org: ${currentOrg?.name || '—'}`}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '9px 0', borderRadius: 'var(--radius)', background: showOrgMenu ? 'var(--red-dim)' : 'var(--surface)', border: `1px solid ${showOrgMenu ? 'var(--border-red)' : 'var(--border)'}`, cursor: 'pointer' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: currentOrg?.color || 'var(--red)', display: 'block' }} />
            </button>
          ) : (
            <button onClick={() => setShowOrgMenu(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentOrg?.color || 'var(--red)', flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{currentOrg?.name || 'sem org'}</span>
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>{role || ''}</span>
            </button>
          )}

          {showOrgMenu && (
            <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: 62, left: c ? 'var(--sidebar-col)' : 'var(--sidebar-w)', marginLeft: 8, width: 230, background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', zIndex: 500, padding: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.3em', color: 'var(--text-dim)', textTransform: 'uppercase', padding: '4px 8px 8px' }}>organizações</div>
              {orgs.map(org => (
                <div key={org.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => selectOrg(org.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: currentOrgId === org.id ? 'var(--text)' : 'var(--text-sub)', background: currentOrgId === org.id ? 'var(--red-dim)' : 'transparent', border: currentOrgId === org.id ? '1px solid var(--border-red)' : '1px solid transparent', textAlign: 'left' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: org.color || 'var(--red)', flexShrink: 0 }} />
                    {org.name}
                    {currentOrgId === org.id && orgSaved && <span style={{ marginLeft: 'auto', color: '#5aab6e', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}><Check size={10} /> salvo</span>}
                  </button>
                  {isAdmin && (
                    <button onClick={() => { setEditingOrg(org); setShowOrgModal(true); setShowOrgMenu(false) }} style={{ padding: '6px 7px', borderRadius: 'var(--radius)', border: '1px solid transparent', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}>
                      <Pencil size={11} />
                    </button>
                  )}
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
              {isAdmin && (
                <button onClick={() => { setShowMembers(true); setShowOrgMenu(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  <Users size={12} /> membros
                </button>
              )}
              {isAdmin && (
                <button onClick={() => { setEditingOrg(null); setShowOrgModal(true); setShowOrgMenu(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--red)' }}>
                  <Plus size={12} /> nova organização
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Seletor de projeto ── */}
        {projects.length > 0 && (
          <div style={{ padding: c ? '6px 4px' : '8px 10px', borderBottom: '1px solid var(--border)' }}>
            {!c && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 5 }}>projeto</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {c ? (
                <button onClick={() => selectProject(null)} title="todos os projetos" style={{ ...navBtn(!currentProjectId), padding: '9px 0' }}>
                  <FolderKanban size={13} style={{ flexShrink: 0 }} />
                </button>
              ) : (
                <button onClick={() => selectProject(null)} style={{ ...navBtn(!currentProjectId), fontSize: 10, padding: '6px 10px' }}>
                  <FolderKanban size={11} style={{ flexShrink: 0 }} />
                  todos os projetos
                </button>
              )}

              {projects.map(p => (
                c ? (
                  <button key={p.id} onClick={() => selectProject(p.id)} title={p.name}
                    style={{ ...navBtn(currentProjectId === p.id), padding: '9px 0' }}>
                    <span style={{ width: 8, height: 8, borderRadius: p.type === 'individual' ? '50%' : 2, background: currentProjectId === p.id ? 'var(--red)' : 'var(--text-dim)', flexShrink: 0, display: 'block' }} />
                  </button>
                ) : (
                  <button key={p.id} onClick={() => selectProject(p.id)} style={{ ...navBtn(currentProjectId === p.id), fontSize: 10, padding: '6px 10px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: p.type === 'individual' ? '50%' : 2, background: currentProjectId === p.id ? 'var(--red)' : 'var(--text-dim)', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>{p.name}</span>
                  </button>
                )
              ))}

              {isAdmin && !c && (
                <button onClick={() => { setEditingProject(null); setShowProjectModal(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', border: '1px dashed var(--border)', background: 'transparent', cursor: 'pointer', marginTop: 2 }}>
                  <Plus size={10} /> novo projeto
                </button>
              )}
              {isAdmin && c && (
                <button onClick={() => { setEditingProject(null); setShowProjectModal(true) }} title="novo projeto"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 0', borderRadius: 'var(--radius)', color: 'var(--text-dim)', border: '1px dashed var(--border)', background: 'transparent', cursor: 'pointer', marginTop: 2 }}>
                  <Plus size={11} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Preview de grupos ── */}
        {currentProjectId && groups.length > 0 && (
          <div style={{ padding: c ? '6px 4px' : '8px 10px', borderBottom: '1px solid var(--border)' }}>
            {!c && (
              <button
                onClick={() => setShowGroupsPreview(v => !v)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: showGroupsPreview ? 5 : 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <span>grupos ({groups.length})</span>
                {showGroupsPreview ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            )}
            {(showGroupsPreview || c) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {groups.slice(0, c ? 6 : 8).map(g => {
                  const statusColor = g.status === 'active' ? '#5aab6e' : g.status === 'attention' ? '#c8922a' : 'var(--border)'
                  return c ? (
                    <div key={g.id} title={g.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'block' }} />
                    </div>
                  ) : (
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 'var(--radius)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, letterSpacing: '0.04em' }}>{g.name}</span>
                    </div>
                  )
                })}
                {groups.length > 8 && !c && (
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', padding: '2px 10px', letterSpacing: '0.1em' }}>
                    +{groups.length - 8} mais
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Nav principal ── */}
        <nav style={{ flex: 1, padding: c ? '10px 6px' : '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { icon: LayoutDashboard, label: 'projetos',  path: '/' },
            { icon: FileText,        label: 'anotações', path: '/notes' },
          ].map(({ icon: Icon, label, path }) => (
            <button key={path} onClick={() => navTo(path)} title={c ? label : ''} style={navBtn(isActive(path))}>
              <Icon size={14} style={{ flexShrink: 0 }} />
              {!c && label}
            </button>
          ))}

          <a href={EXTENSION_URL} target="_blank" rel="noreferrer" title={c ? 'extensão chrome' : ''} style={{ ...navBtn(false), textDecoration: 'none', marginTop: 8, borderStyle: 'dashed', color: 'var(--red)', borderColor: 'var(--border-red)', opacity: 0.7 }}>
            <ExternalLink size={13} style={{ flexShrink: 0 }} />
            {!c && 'extensão chrome'}
          </a>
        </nav>

        {/* ── Rodapé ── */}
        <div style={{ padding: c ? '8px 6px' : '8px 8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { icon: CircleUser, label: 'perfil',        path: '/profile' },
            { icon: Settings,   label: 'configurações', path: '/settings' },
          ].map(({ icon: Icon, label, path }) => (
            <button key={path} onClick={() => navTo(path)} title={c ? label : ''} style={navBtn(isActive(path))}>
              <Icon size={14} style={{ flexShrink: 0 }} />
              {!c && label}
            </button>
          ))}

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          <button onClick={toggleTheme} title={isDark ? 'light mode' : 'dark mode'} style={{ display: 'flex', alignItems: 'center', justifyContent: c ? 'center' : 'space-between', padding: c ? '9px 0' : '7px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'var(--surface)' }}>
            {isDark ? <><Sun size={13} />{!c && <span>light mode</span>}</> : <><Moon size={13} />{!c && <span>dark mode</span>}</>}
          </button>

          {!c && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>}

          <button onClick={signOut} title="sair" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: c ? '9px 0' : '7px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', border: '1px solid var(--border)', background: 'transparent' }}>
            <LogOut size={13} />{!c && 'sair'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <aside className="mobile-hidden" style={{ width: collapsed ? 'var(--sidebar-col)' : 'var(--sidebar-w)', minHeight: '100vh', background: 'var(--bg-alt)', borderRight: '1px solid var(--border)', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, transition: 'width var(--mid) var(--ease)', overflow: 'visible' }}>
        <SidebarContent />
        <button className="mobile-hidden" onClick={() => setCollapsed(c => !c)} style={{ position: 'absolute', right: -13, top: 56, width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border-red)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.35)', cursor: 'pointer', zIndex: 101 }}>
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </aside>

      <button onClick={() => setMobileOpen(true)} style={{ display: 'none', position: 'fixed', top: 14, left: 16, zIndex: 30, width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-red)', color: 'var(--red)', alignItems: 'center', justifyContent: 'center' }} className="mobile-menu-btn">
        <Menu size={16} />
      </button>

      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 40 }} />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 280, background: 'var(--bg-alt)', borderRight: '1px solid var(--border)', zIndex: 50, overflowY: 'auto' }}>
            <SidebarContent isMobile />
          </div>
        </>
      )}

      {showOrgMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setShowOrgMenu(false)} />}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @media (max-width: 768px) {
          .mobile-hidden { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>

      {showMembers    && currentOrg    && <OrgMembersModal org={currentOrg} onClose={() => setShowMembers(false)} />}
      {showOrgModal   && <OrgModal onClose={(newId) => { setShowOrgModal(false); setEditingOrg(null); if (newId) setCurrentOrgId(newId) }} onCreate={createOrg} onEdit={updateOrg} onDelete={async (id) => { const r = await deleteOrg(id); if (!r.error && id === currentOrgId) { const rem = orgs.filter(o => o.id !== id); if (rem.length) setCurrentOrgId(rem[0].id) } return r }} editOrg={editingOrg} />}
      {showProjectModal && <ProjectModal project={editingProject} onClose={() => { setShowProjectModal(false); setEditingProject(null) }} onSave={handleSaveProject} />}
    </>
  )
}
