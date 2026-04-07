import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useNotes(groupId, orgId) {
  const { user }  = useAuth()
  const [notes,   setNotes]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) { setNotes([]); setLoading(false); return }
    fetchNotes()
  }, [groupId])

  async function fetchNotes() {
    setLoading(true)
    const { data } = await supabase
      .from('notes').select('*').eq('group_id', groupId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }

  async function createNote(payload = {}) {
    const { data, error } = await supabase.from('notes')
      .insert({ group_id: groupId, org_id: orgId, title: payload.title || 'Nova anotação', content: payload.content || '', pinned: false, author_id: user?.id, project_id: payload.project_id || null })
      .select().single()
    if (!error) setNotes(prev => [data, ...prev])
    return { data, error }
  }

  async function updateNote(id, payload) {
    const { data, error } = await supabase.from('notes').update(payload).eq('id', id).select().single()
    if (!error) setNotes(prev => prev.map(n => n.id === id ? data : n))
    return { data, error }
  }

  async function deleteNote(id) {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) setNotes(prev => prev.filter(n => n.id !== id))
    return { error }
  }

  async function togglePin(id, pinned) { return updateNote(id, { pinned: !pinned }) }

  return { notes, loading, createNote, updateNote, deleteNote, togglePin, refresh: fetchNotes }
}

export function useOrgNotes(orgId, projectId = null) {
  const { user }  = useAuth()
  const [notes,   setNotes]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) { setNotes([]); setLoading(false); return }
    fetchAll()
  }, [orgId, projectId])

  async function fetchAll() {
    setLoading(true)
    let query = supabase
      .from('notes')
      .select('*, groups(id, name, color)')
      .eq('org_id', orgId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })

    if (projectId) query = query.eq('project_id', projectId)

    const { data } = await query
    setNotes(data || [])
    setLoading(false)
  }

  async function createNote(groupId, title = 'Nova anotação', extraPayload = {}) {
    const { data, error } = await supabase.from('notes')
      .insert({ group_id: groupId, org_id: orgId, title, content: '', pinned: false, author_id: user?.id, project_id: projectId || null, ...extraPayload })
      .select('*, groups(id, name, color)').single()
    if (!error) setNotes(prev => [data, ...prev])
    return { data, error }
  }

  async function updateNote(id, payload) {
    const { data, error } = await supabase.from('notes').update(payload).eq('id', id)
      .select('*, groups(id, name, color)').single()
    if (!error) setNotes(prev => prev.map(n => n.id === id ? data : n))
    return { data, error }
  }

  async function deleteNote(id) {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) setNotes(prev => prev.filter(n => n.id !== id))
    return { error }
  }

  async function togglePin(id, pinned) { return updateNote(id, { pinned: !pinned }) }

  return { notes, loading, createNote, updateNote, deleteNote, togglePin, refresh: fetchAll }
}
