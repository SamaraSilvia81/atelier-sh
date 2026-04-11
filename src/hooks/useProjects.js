import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { logActivity } from './useActivityLog'

export function useProjects(orgId) {
  const { user }   = useAuth()
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!orgId) { setProjects([]); setLoading(false); return }
    load()
  }, [orgId])

  async function load() {
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
    if (!error && data) {
      setProjects(prev => [...prev, data])
      await logActivity(orgId, user?.id, 'created', 'project', data.id, data.name, { type: data.type })
    }
    return { data, error }
  }

  async function updateProject(id, payload) {
    const current = projects.find(p => p.id === id)
    const { data, error } = await supabase
      .from('projects').update(payload).eq('id', id).select().single()
    if (!error && data) {
      setProjects(prev => prev.map(p => p.id === id ? data : p))
      const action = payload.visibility && payload.visibility !== current?.visibility
        ? 'visibility_changed'
        : (payload.status && payload.status !== current?.status ? 'status_changed' : 'updated')
      await logActivity(orgId, user?.id, action, 'project', id, data.name, { fields: Object.keys(payload) })
    }
    return { data, error }
  }

  async function deleteProject(id) {
    const target = projects.find(p => p.id === id)
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== id))
      await logActivity(orgId, user?.id, 'deleted', 'project', id, target?.name)
    }
    return { error }
  }

  async function duplicateProject(id) {
    const src = projects.find(p => p.id === id)
    if (!src) return { error: 'projeto não encontrado' }
    const { id: _, created_at, updated_at, ...rest } = src
    return createProject({ ...rest, name: src.name + ' (cópia)', is_template: false })
  }

  async function saveProjectAsTemplate(id) {
    return updateProject(id, { is_template: true })
  }

  async function unsetProjectTemplate(id) {
    return updateProject(id, { is_template: false })
  }

  return { projects, loading, createProject, updateProject, deleteProject, duplicateProject, saveProjectAsTemplate, unsetProjectTemplate, refresh: load }
}