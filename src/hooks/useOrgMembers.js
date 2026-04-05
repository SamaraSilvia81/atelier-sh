import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useOrgMembers(orgId) {
  const { user } = useAuth()
  const [members,  setMembers]  = useState([])
  const [invites,  setInvites]  = useState([])
  const [myRole,   setMyRole]   = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!orgId || !user) return
    load()
  }, [orgId, user?.id])

  async function load() {
    setLoading(true)

    const [{ data: mems }, { data: invs }] = await Promise.all([
      supabase
        .from('org_members')
        .select('*, profiles(name, settings)')
        .eq('org_id', orgId),
      supabase
        .from('org_invites')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'pending'),
    ])

    setMembers(mems || [])
    setInvites(invs || [])

    const me = (mems || []).find(m => m.user_id === user.id)
    setMyRole(me?.role || null)
    setLoading(false)
  }

  // Convidar por e-mail
  const invite = useCallback(async (email, role = 'viewer') => {
    const { data, error } = await supabase
      .from('org_invites')
      .insert({ org_id: orgId, email, role, invited_by: user.id })
      .select()
      .single()
    if (!error) setInvites(prev => [...prev, data])
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

  // Alterar role de membro
  const updateRole = useCallback(async (memberId, role) => {
    const { data, error } = await supabase
      .from('org_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single()
    if (!error) setMembers(prev => prev.map(m => m.id === memberId ? data : m))
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
  async function acceptInvite(token) {
    const { data, error } = await supabase.rpc('accept_invite', { invite_token: token })
    return { data, error }
  }

  const isAdmin  = myRole === 'admin'
  const isViewer = myRole === 'viewer'

  return {
    members, invites, myRole, loading,
    isAdmin, isViewer,
    invite, revokeInvite, updateRole, removeMember, acceptInvite,
    refresh: load,
  }
}
