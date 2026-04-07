import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useGroupMembers(groupId) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) { setMembers([]); setLoading(false); return }
    fetch()
  }, [groupId])

  async function fetch() {
    setLoading(true)
    const { data } = await supabase
      .from('group_members')
      .select('*, profiles(id, name, avatar)')
      .eq('group_id', groupId)
    setMembers(data || [])
    setLoading(false)
  }

  async function addMember(userId) {
    const { data, error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: userId })
      .select('*, profiles(id, name, avatar)').single()
    if (!error) setMembers(prev => [...prev, data])
    return { data, error }
  }

  async function removeMember(userId) {
    const { error } = await supabase
      .from('group_members')
      .delete().eq('group_id', groupId).eq('user_id', userId)
    if (!error) setMembers(prev => prev.filter(m => m.user_id !== userId))
    return { error }
  }

  return { members, loading, addMember, removeMember, refresh: fetch }
}

// Hook pra saber o grupo do usuário logado dentro de um projeto
export function useMyGroup(projectId, userId) {
  const [myGroup, setMyGroup] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId || !userId) { setMyGroup(null); setLoading(false); return }
    fetch()
  }, [projectId, userId])

  async function fetch() {
    setLoading(true)
    const { data } = await supabase
      .from('group_members')
      .select('*, groups!inner(*, projects!inner(id))')
      .eq('user_id', userId)
      .eq('groups.project_id', projectId)
      .maybeSingle()
    setMyGroup(data?.groups || null)
    setLoading(false)
  }

  return { myGroup, loading, refresh: fetch }
}
