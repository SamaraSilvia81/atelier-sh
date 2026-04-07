import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useProjects(orgId) {
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!orgId) { setProjects([]); setLoading(false); return }
    fetch()
  }, [orgId])

  async function fetch() {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })
    setProjects(data || [])
    setLoading(false)
  }

  async function createProject(payload) {
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...payload, org_id: orgId })
      .select().single()
    if (!error) setProjects(prev => [...prev, data])
    return { data, error }
  }

  async function updateProject(id, payload) {
    const { data, error } = await supabase
      .from('projects').update(payload).eq('id', id).select().single()
    if (!error) setProjects(prev => prev.map(p => p.id === id ? data : p))
    return { data, error }
  }

  async function deleteProject(id) {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) setProjects(prev => prev.filter(p => p.id !== id))
    return { error }
  }

  return { projects, loading, createProject, updateProject, deleteProject, refresh: fetch }
}
