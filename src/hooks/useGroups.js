import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { logActivity } from './useActivityLog'

export function useGroups(orgId, projectId = null) {
  const { user } = useAuth()
  const [groups,  setGroups]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) { setGroups([]); setLoading(false); return }
    fetchGroups()
  }, [orgId, projectId])

  async function fetchGroups() {
    setLoading(true)
    let query = supabase
      .from('groups')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })

    if (projectId) query = query.eq('project_id', projectId)

    const { data } = await query
    setGroups(data || [])
    setLoading(false)
  }

  async function createGroup(payload) {
    const { data, error } = await supabase
      .from('groups')
      .insert({ ...payload, org_id: orgId, project_id: projectId || payload.project_id })
      .select().single()
    if (!error) {
      setGroups(prev => [...prev, data])
      await logActivity(orgId, user?.id, 'created', 'group', data.id, data.name)
    }
    return { data, error }
  }

  async function updateGroup(id, payload) {
    const { data, error } = await supabase
      .from('groups').update(payload).eq('id', id).select().single()
    if (!error) {
      setGroups(prev => prev.map(g => g.id === id ? data : g))
      await logActivity(orgId, user?.id, 'updated', 'group', id, data.name, { fields: Object.keys(payload) })
    }
    return { data, error }
  }

  async function deleteGroup(id) {
    const target = groups.find(g => g.id === id)
    const { error } = await supabase.from('groups').delete().eq('id', id)
    if (!error) {
      setGroups(prev => prev.filter(g => g.id !== id))
      await logActivity(orgId, user?.id, 'deleted', 'group', id, target?.name)
    }
    return { error }
  }

  async function duplicateGroup(id) {
    const src = groups.find(g => g.id === id)
    if (!src) return { error: 'grupo não encontrado' }
    const { id: _, created_at, updated_at, ...rest } = src
    return createGroup({ ...rest, name: src.name + ' (cópia)', is_template: false })
  }

  async function saveGroupAsTemplate(id) {
    const src = groups.find(g => g.id === id)
    if (!src) return { error: 'grupo não encontrado' }
    return updateGroup(id, { is_template: true })
  }

  async function unsetGroupTemplate(id) {
    return updateGroup(id, { is_template: false })
  }

  return { groups, loading, createGroup, updateGroup, deleteGroup, duplicateGroup, saveGroupAsTemplate, unsetGroupTemplate, refresh: fetchGroups }
}