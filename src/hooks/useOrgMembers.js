import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { logActivity } from './useActivityLog'

// Busca perfis por user_ids manualmente (fallback quando o join FK não existe)
async function fetchProfilesFor(userIds) {
  if (!userIds.length) return {}
  const { data } = await supabase
    .from('profiles')
    .select('id, name, avatar')
    .in('id', userIds)
  const map = {}
  for (const p of data || []) map[p.id] = p
  return map
}

export function useOrgMembers(orgId) {
  const { user } = useAuth()
  const [members,  setMembers]  = useState([])
  const [invites,  setInvites]  = useState([])
  const [myRole,   setMyRole]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    if (!orgId || !user) { setLoading(false); return }
    load()
  }, [orgId, user?.id])

  const load = useCallback(async () => {
    if (!orgId || !user) return
    setLoading(true); setError(null)
    try {
      const [memsResult, invsResult] = await Promise.all([
        supabase.from('org_members').select('*').eq('org_id', orgId),
        supabase.from('org_invites').select('*').eq('org_id', orgId).eq('status', 'pending'),
      ])
      if (memsResult.error) throw memsResult.error
      if (invsResult.error) throw invsResult.error

      const mems = memsResult.data || []

      // busca perfis separadamente para evitar dependência de FK no schema cache
      const profileMap = await fetchProfilesFor(mems.map(m => m.user_id))
      const memsWithProfiles = mems.map(m => ({ ...m, profiles: profileMap[m.user_id] || null }))

      setMembers(memsWithProfiles)
      setInvites(invsResult.data || [])

      const me = memsWithProfiles.find(m => m.user_id === user.id)
      setMyRole(me?.role ?? null)
    } catch (err) {
      console.error('[useOrgMembers]', err)
      setError(err.message || 'Erro ao carregar membros')
    } finally {
      setLoading(false)
    }
  }, [orgId, user?.id])

  const invite = useCallback(async (email, role = 'viewer') => {
    if (!email?.trim()) return { data: null, error: { message: 'E-mail obrigatório' } }

    // 1. Insere o convite no banco
    const { data, error } = await supabase
      .from('org_invites')
      .insert({ org_id: orgId, email: email.trim().toLowerCase(), role, invited_by: user.id })
      .select().single()

    if (!error && data) {
      setInvites(prev => [...prev, data])
      await logActivity(orgId, user.id, 'invited', 'invite', data.id, email, { role })

      // 2. Dispara a Edge Function para enviar o e-mail
      try {
        await supabase.functions.invoke('send-invite-email', {
          body: {
            inviteId: data.id,
            token: data.token,
            email: email.trim().toLowerCase(),
            role,
            orgId,
          },
        })
      } catch (emailErr) {
        // Não cancela o fluxo se o email falhar — convite já está criado
        console.warn('[invite] falha ao enviar e-mail:', emailErr)
      }
    }

    return { data, error }
  }, [orgId, user?.id])

  // Cria convite sem e-mail — gera só o link para compartilhar
  const createInviteLink = useCallback(async (role = 'viewer') => {
    const { data, error } = await supabase
      .from('org_invites')
      .insert({ org_id: orgId, email: `link-${Date.now()}@link.atelier`, role, invited_by: user.id })
      .select().single()
    if (!error && data) {
      setInvites(prev => [...prev, data])
      await logActivity(orgId, user.id, 'invited', 'invite', data.id, `link (${role})`, { role, via: 'link' })
    }
    return { data, error }
  }, [orgId, user?.id])

  const revokeInvite = useCallback(async (inviteId) => {
    const target = invites.find(i => i.id === inviteId)
    const { error } = await supabase.from('org_invites').update({ status: 'expired' }).eq('id', inviteId)
    if (!error) {
      setInvites(prev => prev.filter(i => i.id !== inviteId))
      await logActivity(orgId, user.id, 'deleted', 'invite', inviteId, target?.email)
    }
    return { error }
  }, [orgId, user?.id, invites])

  const updateRole = useCallback(async (memberId, role) => {
    const current = members.find(m => m.id === memberId)
    const { data, error } = await supabase
      .from('org_members').update({ role }).eq('id', memberId)
      .select().single()
    if (!error && data) {
      // reanexa o perfil que já temos em memória
      const withProfile = { ...data, profiles: current?.profiles || null }
      setMembers(prev => prev.map(m => m.id === memberId ? withProfile : m))
      await logActivity(orgId, user.id, 'role_changed', 'member', memberId,
        current?.profiles?.name || memberId, { from: current?.role, to: role, user_id: data.user_id })
    }
    return { data, error }
  }, [orgId, user?.id, members])

  const removeMember = useCallback(async (memberId) => {
    const target = members.find(m => m.id === memberId)
    const { error } = await supabase.from('org_members').delete().eq('id', memberId)
    if (!error) {
      setMembers(prev => prev.filter(m => m.id !== memberId))
      await logActivity(orgId, user.id, 'deleted', 'member', memberId, target?.profiles?.name || memberId)
    }
    return { error }
  }, [orgId, user?.id, members])

  const acceptInvite = useCallback(async (token) => {
    const { data, error } = await supabase.rpc('accept_invite', { invite_token: token })
    return { data, error }
  }, [])

  const isAdmin  = myRole === 'admin'
  const isViewer = myRole === 'viewer'

  return {
    members, invites, myRole, loading, error,
    isAdmin, isViewer,
    invite, createInviteLink, revokeInvite, updateRole, removeMember, acceptInvite,
    refresh: load,
  }
}