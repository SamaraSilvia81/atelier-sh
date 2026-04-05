import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useOrgs } from './hooks/useOrgs'
import Sidebar from './components/layout/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Notes from './pages/Notes'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import AcceptInvite from './pages/AcceptInvite'
import { useTheme, ThemeProvider } from './hooks/useTheme.jsx'
import ReviewPanel from './components/groups/ReviewPanel'
import { useSounds } from './hooks/useSounds'
import './styles/global.css'
import './styles/editor.css'

// Listener global de sons
function SoundManager() {
  const sounds = useSounds()

  useEffect(() => {
    function handleClick(e) {
      if (!sounds.isEnabled()) return
      const el = e.target.closest('button, [role="button"], [data-sound-tab]')
      if (!el) return
      // Tab sound: sidebar nav, filter buttons com data-sound-tab
      if (el.dataset.soundTab !== undefined || el.closest('[data-sound-tab]')) {
        sounds.play('tab')
      } else {
        sounds.play('click')
      }
    }

    function handleKeydown(e) {
      if (!sounds.isEnabled()) return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.contentEditable === 'true') {
        if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
          sounds.play('typing')
        } else if (e.key === 'Enter') {
          sounds.play('enter')
        }
      }
    }

    document.addEventListener('click', handleClick, true)
    document.addEventListener('keydown', handleKeydown, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('keydown', handleKeydown, true)
    }
  }, [])

  return null
}

function AppShell() {
  const { user, loading } = useAuth()
  const { orgs } = useOrgs()
  const [currentOrgId, setCurrentOrgId] = useState(() => localStorage.getItem('atelier_org_id') || null)
  const [trelloToken] = useState(() => localStorage.getItem('atelier_trello_token') || '')
  const [collapsed, setCollapsed]   = useState(() => localStorage.getItem('atelier_sidebar') === 'collapsed')
  // [EXTENSÃO] ReviewPanel desativado — substituído pela extensão Chrome
  // const [sidebarReviewOpen, setSidebarReviewOpen] = useState(false)

  useEffect(() => {
    if (orgs.length === 0) return
    const valid = orgs.find(o => o.id === currentOrgId)
    if (!valid) setCurrentOrgId(orgs[0].id)
  }, [orgs])

  useEffect(() => {
    if (currentOrgId) localStorage.setItem('atelier_org_id', currentOrgId)
  }, [currentOrgId])

  useEffect(() => {
    localStorage.setItem('atelier_sidebar', collapsed ? 'collapsed' : 'open')
  }, [collapsed])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.25em', color: 'var(--text-dim)' }}>carregando_</span>
    </div>
  )

  if (!user) return <Login />

  const currentOrg = orgs.find(o => o.id === currentOrgId) || orgs[0] || null
  const sideW = collapsed ? 'var(--sidebar-col)' : 'var(--sidebar-w)'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SoundManager />
      <Sidebar
        currentOrgId={currentOrgId}
        setCurrentOrgId={setCurrentOrgId}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onOpenReview={() => {}} // [EXTENSÃO] desativado — extensão Chrome cuida disso
      />
      <main style={{
        marginLeft: sideW,
        flex: 1,
        transition: 'margin-left var(--mid) var(--ease)',
        minWidth: 0,
        minHeight: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Routes>
          <Route path="/"         element={<Dashboard org={currentOrg} trelloToken={trelloToken} />} />
          <Route path="/notes"    element={<Notes org={currentOrg} />} />
          <Route path="/settings" element={<Settings currentOrgId={currentOrgId} />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/invite" element={<AcceptInvite />} />
          <Route path="*"         element={<Navigate to="/" />} />
        </Routes>
      </main>
      {/* [EXTENSÃO] ReviewPanel comentado — substituído pela extensão Chrome atelier-sh-extension
      {sidebarReviewOpen && (
        <ReviewPanel
          group={{ id: 'sidebar-review', name: 'Review Editor', github_repo: '' }}
          orgId={currentOrg?.id}
          onClose={() => setSidebarReviewOpen(false)}
        />
      )}
      */}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
