import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useGroups(orgId) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) { setGroups([]); setLoading(false); return }
    fetchGroups()
  }, [orgId])

  async function fetchGroups() {
    setLoading(true)
    const { data } = await supabase
      .from('groups')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })
    setGroups(data || [])
    setLoading(false)
  }

  async function createGroup(payload) {
    const { data, error } = await supabase
      .from('groups')
      .insert({ ...payload, org_id: orgId })
      .select()
      .single()
    if (!error) setGroups(prev => [...prev, data])
    return { data, error }
  }

  async function updateGroup(id, payload) {
    const { data, error } = await supabase
      .from('groups')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (!error) setGroups(prev => prev.map(g => g.id === id ? data : g))
    return { data, error }
  }

  async function deleteGroup(id) {
    const { error } = await supabase.from('groups').delete().eq('id', id)
    if (!error) setGroups(prev => prev.filter(g => g.id !== id))
    return { error }
  }

  return { groups, loading, createGroup, updateGroup, deleteGroup, refresh: fetchGroups }
}
