import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useOrgs } from '../../hooks/useOrgs'
import { useTheme } from '../../hooks/useTheme.jsx'
import { LayoutDashboard, FileText, Settings, LogOut, Plus, ChevronLeft, ChevronRight, Sun, Moon, Menu, X, Check, CircleUser, Monitor, Pencil } from 'lucide-react'
import OrgModal from './OrgModal'
import OrgMembersModal from './OrgMembersModal'

export default function Sidebar({ currentOrgId, setCurrentOrgId, collapsed, setCollapsed, onOpenReview }) {
  const { user, signOut } = useAuth()
  const { orgs, createOrg, updateOrg, deleteOrg } = useOrgs()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [editingOrg,   setEditingOrg]   = useState(null)
  const [showOrgMenu, setShowOrgMenu]   = useState(false)
  const [mobileOpen, setMobileOpen]     = useState(false)
  const [orgSaved, setOrgSaved]         = useState(false)

  const currentOrg = orgs.find(o => o.id === currentOrgId) || orgs[0]
  const isDark = !theme.endsWith('-light')

  // Nav principal — topo
  const mainNav = [
    { icon: LayoutDashboard, label: 'dashboard',  path: '/' },
    { icon: FileText,        label: 'anotações',  path: '/notes' },
  ]

  // Nav secundário — rodapé (acima do toggle)
  const bottomNav = [
    { icon: CircleUser, label: 'perfil',          path: '/profile' },
    { icon: Settings,   label: 'configurações',   path: '/settings' },
  ]

  function isActive(p) { return p === '/' ? location.pathname === '/' : location.pathname.startsWith(p) }
  function navTo(path) { navigate(path); setMobileOpen(false) }
  function selectOrg(id) {
    setCurrentOrgId(id); setOrgSaved(true)
    setTimeout(() => { setShowOrgMenu(false); setOrgSaved(false) }, 1000)
  }

  const navBtn = (active) => ({
    display: 'flex', alignItems: 'center',
    gap: collapsed ? 0 : 10,
    justifyContent: collapsed ? 'center' : 'flex-start',
    width: '100%', padding: collapsed ? '11px 0' : '9px 12px',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--ff-mono)', fontSize: 11,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    background: active ? 'var(--red-dim)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-muted)',
    border: active ? '1px solid var(--border-red)' : '1px solid transparent',
    transition: 'all var(--fast) var(--ease)',
  })

  const SidebarContent = ({ isMobile = false }) => {
    const col = collapsed && !isMobile
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Logo */}
        <div style={{ padding: col ? '16px 0' : '18px 18px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: col ? 'center' : 'space-between', minHeight: 62 }}>
          {col ? (
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

        {/* Org switcher */}
        <div style={{ padding: col ? '10px 6px' : '10px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          {col ? (
            <button onClick={() => setShowOrgMenu(!showOrgMenu)} title={currentOrg?.name || 'organizações'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '8px 0' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 2s ease-in-out infinite', display: 'block' }} />
            </button>
          ) : (
            <button onClick={() => setShowOrgMenu(!showOrgMenu)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 2s ease-in-out infinite', flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: 'left', fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentOrg?.name || 'sem org'}
              </span>
              <ChevronRight size={11} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
            </button>
          )}

          {showOrgMenu && (
            <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: 60, left: col ? 'var(--sidebar-col)' : 'var(--sidebar-w)', marginLeft: 8, width: 230, background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', zIndex: 500, padding: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.3em', color: 'var(--text-dim)', textTransform: 'uppercase', padding: '4px 8px 8px' }}>organizações</div>
              {orgs.map(org => (
                <div key={org.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => selectOrg(org.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: currentOrgId === org.id ? 'var(--text)' : 'var(--text-sub)', background: currentOrgId === org.id ? 'var(--red-dim)' : 'transparent', border: currentOrgId === org.id ? '1px solid var(--border-red)' : '1px solid transparent', textAlign: 'left' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: org.color || (currentOrgId === org.id ? 'var(--red)' : 'var(--text-dim)'), flexShrink: 0 }} />
                    {org.name}
                    {currentOrgId === org.id && orgSaved && <span style={{ marginLeft: 'auto', fontFamily: 'var(--ff-mono)', fontSize: 10, color: '#5aab6e', display: 'flex', alignItems: 'center', gap: 3 }}><Check size={10} /> salvo</span>}
                  </button>
                  <button onClick={e => { e.stopPropagation(); setEditingOrg(org); setShowOrgModal(true); setShowOrgMenu(false) }}
                    title="editar organização"
                    style={{ padding: '6px 7px', borderRadius: 'var(--radius)', border: '1px solid transparent', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-sub)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-dim)' }}>
                    <Pencil size={11} />
                  </button>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
              <button onClick={() => { setShowMembers(true); setShowOrgMenu(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: 12 }}>⊹</span> membros
              </button>
              <button onClick={() => { setEditingOrg(null); setShowOrgModal(true); setShowOrgMenu(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--red)' }}>
                <Plus size={12} /> nova organização
              </button>
            </div>
          )}
        </div>

        {/* Nav principal */}
        <nav style={{ flex: 1, padding: col ? '10px 6px' : '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {mainNav.map(({ icon: Icon, label, path }) => (
            <button key={path} onClick={() => navTo(path)} title={col ? label : ''} style={navBtn(isActive(path))}>
              <Icon size={14} style={{ flexShrink: 0 }} />
              {!col && label}
            </button>
          ))}

          {/* Botão Review Editor no sidebar */}
          {onOpenReview && (
            <button onClick={() => { onOpenReview(); setMobileOpen(false) }} title={col ? 'review editor' : ''} style={{ ...navBtn(false), color: 'var(--red)', borderColor: 'var(--border-acc)', background: 'rgba(var(--acc), 0.04)', marginTop: 8 }}>
              <Monitor size={14} style={{ flexShrink: 0 }} />
              {!col && 'review editor'}
            </button>
          )}
        </nav>

        {/* Rodapé — perfil, config, tema, sair */}
        <div style={{ padding: col ? '8px 6px' : '8px 8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Perfil e Configurações */}
          {bottomNav.map(({ icon: Icon, label, path }) => (
            <button key={path} onClick={() => navTo(path)} title={col ? label : ''} style={navBtn(isActive(path))}>
              <Icon size={14} style={{ flexShrink: 0 }} />
              {!col && label}
            </button>
          ))}

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          {/* Toggle tema */}
          <button onClick={toggleTheme} title={isDark ? 'light mode' : 'dark mode'} style={{ display: 'flex', alignItems: 'center', justifyContent: col ? 'center' : 'space-between', padding: col ? '9px 0' : '7px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'var(--surface)' }}>
            {isDark
              ? <><Sun size={13} />{!col && <span>light mode</span>}</>
              : <><Moon size={13} />{!col && <span>dark mode</span>}</>
            }
          </button>

          {/* Email */}
          {!col && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>}

          {/* Sair */}
          <button onClick={signOut} title="sair" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: col ? '9px 0' : '7px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', border: '1px solid var(--border)', background: 'transparent' }}>
            <LogOut size={13} />
            {!col && 'sair'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <aside className="mobile-hidden" style={{ width: collapsed ? 'var(--sidebar-col)' : 'var(--sidebar-w)', minHeight: '100vh', background: 'var(--bg-alt)', borderRight: '1px solid var(--border)', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, transition: 'width var(--mid) var(--ease)', overflow: 'visible' }}>
        <SidebarContent />
        {/* Botão de colapso — na borda direita do sidebar, sempre visível */}
        <button
          className="mobile-hidden"
          onClick={() => { setCollapsed(c => !c); setShowOrgMenu(false) }}
          style={{
            position: 'absolute', right: -13, top: 56,
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--bg-card)', border: '1px solid var(--border-red)',
            color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)', cursor: 'pointer', zIndex: 101,
            transition: 'transform var(--fast)',
          }}
        >
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
            <SidebarContent isMobile={true} />
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
      {showMembers && currentOrg && <OrgMembersModal org={currentOrg} onClose={() => setShowMembers(false)} />}
      {showOrgModal && (
        <OrgModal
          onClose={(newId) => {
            setShowOrgModal(false)
            setEditingOrg(null)
            // Auto-seleciona a nova org logo após criar
            if (newId) setCurrentOrgId(newId)
          }}
          onCreate={createOrg}
          onEdit={updateOrg}
          onDelete={async (id) => {
            const result = await deleteOrg(id)
            // Se deletou a org atual, vai pra primeira disponível
            if (!result.error && id === currentOrgId) {
              const remaining = orgs.filter(o => o.id !== id)
              if (remaining.length > 0) setCurrentOrgId(remaining[0].id)
            }
            return result
          }}
          editOrg={editingOrg}
        />
      )}
    </>
  )
}
