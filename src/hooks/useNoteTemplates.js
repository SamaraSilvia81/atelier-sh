import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { logActivity } from './useActivityLog'

export function useNoteTemplates(orgId) {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) { setTemplates([]); setLoading(false); return }
    fetchTemplates()
  }, [orgId])

  async function fetchTemplates() {
    setLoading(true)
    const { data } = await supabase
      .from('note_templates')
      .select('*, profiles:created_by(name, avatar)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    setTemplates(data || [])
    setLoading(false)
  }

  async function saveAsTemplate({ title, content }) {
    const { data, error } = await supabase.from('note_templates').insert({
      org_id: orgId,
      title: title || 'Template sem título',
      content: content || '',
      created_by: user?.id,
    }).select('*, profiles:created_by(name, avatar)').single()

    if (!error && data) {
      setTemplates(prev => [data, ...prev])
      await logActivity(orgId, user?.id, 'created', 'note_template', data.id, data.title)
    }
    return { data, error }
  }

  async function deleteTemplate(id) {
    const target = templates.find(t => t.id === id)
    const { error } = await supabase.from('note_templates').delete().eq('id', id)
    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== id))
      await logActivity(orgId, user?.id, 'deleted', 'note_template', id, target?.title)
    }
    return { error }
  }

  return { templates, loading, saveAsTemplate, deleteTemplate, refresh: fetchTemplates }
}