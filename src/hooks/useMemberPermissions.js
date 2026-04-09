import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { logActivity } from './useActivityLog'

// Gerencia permissões por membro por recurso (grupo/projeto)
export function useMemberPermissions(orgId) {
  const { user }        = useAuth()
  const [perms,         setPerms]   = useState([])
  const [loading,       setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) { setPerms([]); setLoading(false); return }
    load()
  }, [orgId])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('member_permissions')
      .select('*, profiles:user_id(name, avatar)')
      .eq('org_id', orgId)
    setPerms(data || [])
    setLoading(false)
  }, [orgId])

  // Retorna permissões de um membro específico num recurso
  function getPermsFor(userId, resourceType, resourceId) {
    return perms.filter(
      p => p.user_id === userId &&
           p.resource_type === resourceType &&
           p.resource_id === resourceId
    )
  }

  // Verifica se membro pode usar uma integração num grupo específico
  function canIntegrate(userId, resourceId, integration) {
    return perms.some(
      p => p.user_id === userId &&
           p.resource_id === resourceId &&
           p.can_integrate === true &&
           (p.integration === integration || p.integration === 'all')
    )
  }

  // Verifica se membro pode editar um recurso
  function canEdit(userId, resourceType, resourceId) {
    return perms.some(
      p => p.user_id === userId &&
           p.resource_type === resourceType &&
           p.resource_id === resourceId &&
           p.can_edit === true
    )
  }

  // Upsert de permissão
  const setPermission = useCallback(async (userId, resourceType, resourceId, integration, flags) => {
    const payload = {
      org_id:        orgId,
      user_id:       userId,
      resource_type: resourceType,
      resource_id:   resourceId,
      integration:   integration || 'all',
      granted_by:    user?.id,
      ...flags,
    }

    const { data, error } = await supabase
      .from('member_permissions')
      .upsert(payload, { onConflict: 'org_id,user_id,resource_type,resource_id,integration' })
      .select()
      .single()

    if (!error && data) {
      setPerms(prev => {
        const idx = prev.findIndex(
          p => p.user_id === userId && p.resource_type === resourceType &&
               p.resource_id === resourceId && p.integration === (integration || 'all')
        )
        if (idx >= 0) { const n = [...prev]; n[idx] = data; return n }
        return [...prev, data]
      })
      await logActivity(orgId, user?.id, 'permission_changed', resourceType, resourceId, null, { user_id: userId, integration, ...flags })
    }
    return { data, error }
  }, [orgId, user?.id])

  // Remove permissão
  const removePermission = useCallback(async (permId) => {
    const { error } = await supabase
      .from('member_permissions')
      .delete()
      .eq('id', permId)
    if (!error) setPerms(prev => prev.filter(p => p.id !== permId))
    return { error }
  }, [])

  return {
    perms, loading,
    getPermsFor, canIntegrate, canEdit,
    setPermission, removePermission,
    refresh: load,
  }
}

// Hook leve — só para o próprio membro checar suas permissões
export function useMyPermissions(orgId) {
  const { user }  = useAuth()
  const [perms,   setPerms]   = useState([])

  useEffect(() => {
    if (!orgId || !user) return
    supabase
      .from('member_permissions')
      .select('*')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .then(({ data }) => setPerms(data || []))
  }, [orgId, user?.id])

  function canIntegrate(resourceId, integration) {
    return perms.some(
      p => p.resource_id === resourceId &&
           p.can_integrate === true &&
           (p.integration === integration || p.integration === 'all')
    )
  }

  function canEdit(resourceType, resourceId) {
    return perms.some(
      p => p.resource_type === resourceType &&
           p.resource_id === resourceId &&
           p.can_edit === true
    )
  }

  return { perms, canIntegrate, canEdit }
}
