import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

// Hook central de permissão — use em qualquer componente
// role: 'owner' | 'admin' | 'member' | 'viewer' | null
export function useRole(orgId) {
  const { user, getMyRole } = useAuth()
  const [role,    setRole]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId || !user) { setRole(null); setLoading(false); return }

    async function resolveRole() {
      // 1. Tenta via RPC (get_my_role)
      const rpcRole = await getMyRole(orgId)
      if (rpcRole) { setRole(rpcRole); setLoading(false); return }

      // 2. Fallback: verifica se é owner direto na tabela organizations
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', orgId)
        .single()
      if (org?.owner_id === user.id) { setRole('owner'); setLoading(false); return }

      // 3. Fallback: busca role na tabela org_members
      const { data: member } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', user.id)
        .single()
      setRole(member?.role ?? null)
      setLoading(false)
    }

    resolveRole()
  }, [orgId, user?.id])

  const isOwner  = role === 'owner'
  const isAdmin  = role === 'owner' || role === 'admin'
  const isMember = role === 'member' || role === 'viewer' || isAdmin
  const canWrite = isAdmin  // só owner e admin criam/editam grupos, projetos etc

  return { role, loading, isOwner, isAdmin, isMember, canWrite }
}