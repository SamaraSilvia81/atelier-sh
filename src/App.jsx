import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useOrgs }    from './hooks/useOrgs'
import { useRole }    from './hooks/useRole'
import { useProfile } from './hooks/useProfile'
import { useProjects } from './hooks/useProjects'
import Sidebar         from './components/layout/Sidebar'
import Login           from './pages/Login'
import Onboarding      from './pages/Onboarding'
import ProjectsDashboard from './pages/ProjectsDashboard'
import GroupsDashboard   from './pages/GroupsDashboard'
import Notes           from './pages/Notes'
import Settings        from './pages/Settings'
import Profile         from './pages/Profile'
import AcceptInvite    from './pages/AcceptInvite'
import ActivityLog     from './pages/ActivityLog'
import SplashScreen    from './components/SplashScreen'
import { useTheme, ThemeProvider } from './hooks/useTheme.jsx'
import { useSounds }   from './hooks/useSounds'
import './styles/global.css'
import './styles/editor.css'

function SoundManager() {
  const sounds = useSounds()
  useEffect(() => {
    function handleClick(e) {
      if (!sounds.isEnabled()) return
      const el = e.target.closest('button, [role="button"], [data-sound-tab]')
      if (!el) return
      if (el.dataset.soundTab !== undefined || el.closest('[data-sound-tab]')) sounds.play('tab')
      else sounds.play('click')
    }
    function handleKeydown(e) {
      if (!sounds.isEnabled()) return
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.contentEditable === 'true') {
        if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') sounds.play('typing')
        else if (e.key === 'Enter') sounds.play('enter')
      }
    }
    document.addEventListener('click', handleClick, true)
    document.addEventListener('keydown', handleKeydown, true)
    return () => { document.removeEventListener('click', handleClick, true); document.removeEventListener('keydown', handleKeydown, true) }
  }, [])
  return null
}

function AppShell() {
  const { user, loading }   = useAuth()
  const { orgs }            = useOrgs()
  const { profile, loading: profileLoading } = useProfile()

  const [currentOrgId,     setCurrentOrgId]     = useState(() => localStorage.getItem('atelier_org_id') || null)
  const [currentProjectId, setCurrentProjectId] = useState(() => localStorage.getItem('atelier_project_id') || null)
  const [activeProject,    setActiveProject]    = useState(null)  // objeto completo do projeto selecionado
  const [trelloToken]      = useState(() => localStorage.getItem('atelier_trello_token') || '')
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('atelier_sidebar') === 'collapsed')
  const [splashDone, setSplashDone] = useState(() => sessionStorage.getItem('atelier_splash_done') === '1')

  const { role, isAdmin } = useRole(currentOrgId)
  const { projects }      = useProjects(currentOrgId)

  useEffect(() => {
    if (orgs.length === 0) return
    const valid = orgs.find(o => o.id === currentOrgId)
    if (!valid) setCurrentOrgId(orgs[0].id)
  }, [orgs])

  useEffect(() => {
    if (currentOrgId) localStorage.setItem('atelier_org_id', currentOrgId)
  }, [currentOrgId])

  useEffect(() => {
    if (currentProjectId) localStorage.setItem('atelier_project_id', currentProjectId)
    else localStorage.removeItem('atelier_project_id')
  }, [currentProjectId])

  useEffect(() => {
    localStorage.setItem('atelier_sidebar', collapsed ? 'collapsed' : 'open')
  }, [collapsed])

  // sincroniza activeProject com currentProjectId
  useEffect(() => {
    if (currentProjectId && projects.length > 0) {
      const p = projects.find(p => p.id === currentProjectId)
      setActiveProject(p || null)
    } else {
      setActiveProject(null)
    }
  }, [currentProjectId, projects])

  function handleSplashDone() {
    sessionStorage.setItem('atelier_splash_done', '1')
    setSplashDone(true)
  }

  function handleSelectProject(project) {
    setCurrentProjectId(project.id)
    setActiveProject(project)
  }

  function handleBackToProjects() {
    setCurrentProjectId(null)
    setActiveProject(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, letterSpacing: '0.25em', color: 'var(--text-dim)' }}>carregando_</span>
    </div>
  )

  if (!user) return <Login />

  // splash — só na primeira vez na sessão
  if (!splashDone) return <SplashScreen onDone={handleSplashDone} />

  // onboarding — usuário novo sem nome no perfil
  if (!profileLoading && !profile?.name) {
    // só redireciona se não estiver já em /onboarding
    if (window.location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />
    }
  }

  const currentOrg = orgs.find(o => o.id === currentOrgId) || orgs[0] || null
  const sideW = collapsed ? 'var(--sidebar-col)' : 'var(--sidebar-w)'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SoundManager />
      <Sidebar
        currentOrgId={currentOrgId}
        setCurrentOrgId={setCurrentOrgId}
        currentProjectId={currentProjectId}
        setCurrentProjectId={setCurrentProjectId}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      <main style={{ marginLeft: sideW, flex: 1, transition: 'margin-left var(--mid) var(--ease)', minWidth: 0, minHeight: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />

          {/* dashboard: sem projeto → lista de projetos | com projeto → lista de grupos */}
          <Route path="/" element={
            activeProject
              ? <GroupsDashboard
                  org={currentOrg}
                  project={activeProject}
                  projectId={activeProject.id}
                  role={role}
                  isAdmin={isAdmin}
                  trelloToken={trelloToken}
                  onBack={handleBackToProjects}
                />
              : <ProjectsDashboard
                  org={currentOrg}
                  isAdmin={isAdmin}
                  onSelectProject={handleSelectProject}
                />
          } />

          <Route path="/notes"    element={<Notes    org={currentOrg} projectId={currentProjectId} role={role} isAdmin={isAdmin} />} />
          <Route path="/activity" element={<ActivityLog org={currentOrg} />} />
          <Route path="/settings" element={<Settings currentOrgId={currentOrgId} />} />
          <Route path="/profile"  element={<Profile />} />
          <Route path="/invite"   element={<AcceptInvite />} />
          <Route path="*"         element={<Navigate to="/" />} />
        </Routes>
      </main>
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
