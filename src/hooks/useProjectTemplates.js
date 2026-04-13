import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useProjectTemplates(orgId) {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    if (!orgId) return

    let cancelled = false
    supabase
      .from('project_templates')
      .select('*, profiles:created_by(name, avatar)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error) setTemplates(data || [])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [orgId])

  async function saveAsTemplate({ name, description, type, visibility }) {
    const { data, error } = await supabase
      .from('project_templates')
      .insert({ org_id: orgId, name, description, type, visibility, created_by: user?.id })
      .select('*, profiles:created_by(name, avatar)')
      .single()
    if (!error && data) setTemplates(prev => [data, ...prev])
    return { data, error }
  }

  async function deleteTemplate(id) {
    const { error } = await supabase.from('project_templates').delete().eq('id', id)
    if (!error) setTemplates(prev => prev.filter(t => t.id !== id))
    return { error }
  }

  return { templates, loading, saveAsTemplate, deleteTemplate }
}
