import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useOrgMembers(orgId) {
  const { user } = useAuth()
  const [members,  setMembers]  = useState([])
  const [invites,  setInvites]  = useState([])
  const [myRole,   setMyRole]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    if (!orgId || !user) {
      setLoading(false)
      return
    }
    load()
  }, [orgId, user?.id])

  const load = useCallback(async () => {
    if (!orgId || !user) return
    setLoading(true)
    setError(null)

    try {
      const [memsResult, invsResult] = await Promise.all([
        supabase
          .from('org_members')
          // profiles não tem coluna "settings" — removida para evitar erro de join
          .select('*, profiles(name, avatar)')
          .eq('org_id', orgId),
        supabase
          .from('org_invites')
          .select('*')
          .eq('org_id', orgId)
          .eq('status', 'pending'),
      ])

      if (memsResult.error) throw memsResult.error
      if (invsResult.error) throw invsResult.error

      const mems = memsResult.data || []
      const invs = invsResult.data || []

      setMembers(mems)
      setInvites(invs)

      const me = mems.find(m => m.user_id === user.id)
      setMyRole(me?.role ?? null)
    } catch (err) {
      console.error('[useOrgMembers] load error:', err)
      setError(err.message || 'Erro ao carregar membros')
    } finally {
      // garante que o loading sempre termina, mesmo em caso de erro
      setLoading(false)
    }
  }, [orgId, user?.id])

  // Convidar por e-mail
  const invite = useCallback(async (email, role = 'viewer') => {
    if (!email?.trim()) return { data: null, error: { message: 'E-mail obrigatório' } }

    const { data, error } = await supabase
      .from('org_invites')
      .insert({ org_id: orgId, email: email.trim().toLowerCase(), role, invited_by: user.id })
      .select()
      .single()

    if (!error && data) setInvites(prev => [...prev, data])
    return { data, error }
  }, [orgId, user?.id])

  // Revogar convite
  const revokeInvite = useCallback(async (inviteId) => {
    const { error } = await supabase
      .from('org_invites')
      .update({ status: 'expired' })
      .eq('id', inviteId)

    if (!error) setInvites(prev => prev.filter(i => i.id !== inviteId))
    return { error }
  }, [])

  // Alterar role — recarrega profiles junto para manter dados completos
  const updateRole = useCallback(async (memberId, role) => {
    const { data, error } = await supabase
      .from('org_members')
      .update({ role })
      .eq('id', memberId)
      .select('*, profiles(name, avatar)')
      .single()

    if (!error && data) setMembers(prev => prev.map(m => m.id === memberId ? data : m))
    return { data, error }
  }, [])

  // Remover membro
  const removeMember = useCallback(async (memberId) => {
    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('id', memberId)

    if (!error) setMembers(prev => prev.filter(m => m.id !== memberId))
    return { error }
  }, [])

  // Aceitar convite (via token na URL)
  const acceptInvite = useCallback(async (token) => {
    const { data, error } = await supabase.rpc('accept_invite', { invite_token: token })
    return { data, error }
  }, [])

  const isAdmin  = myRole === 'admin'
  const isViewer = myRole === 'viewer'

  return {
    members, invites, myRole, loading, error,
    isAdmin, isViewer,
    invite, revokeInvite, updateRole, removeMember, acceptInvite,
    refresh: load,
  }
}