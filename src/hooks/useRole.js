import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

// Hook central de permissão — use em qualquer componente
// role: 'owner' | 'admin' | 'member' | 'viewer' | null
export function useRole(orgId) {
  const { user, getMyRole } = useAuth()
  const [role,    setRole]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId || !user) { setRole(null); setLoading(false); return }
    getMyRole(orgId).then(r => { setRole(r); setLoading(false) })
  }, [orgId, user?.id])

  const isOwner  = role === 'owner'
  const isAdmin  = role === 'owner' || role === 'admin'
  const isMember = role === 'member' || role === 'viewer' || isAdmin
  const canWrite = isAdmin  // só owner e admin criam/editam grupos, projetos etc

  return { role, loading, isOwner, isAdmin, isMember, canWrite }
}
