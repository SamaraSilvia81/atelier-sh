import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { logActivity } from './useActivityLog'

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
      .from('notes')
      .select('*, profiles:author_id(name, avatar), editor:last_edited_by(name, avatar)')
      .eq('group_id', groupId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }

  async function createNote(payload = {}) {
    const { data, error } = await supabase.from('notes')
      .insert({
        group_id: groupId,
        org_id: orgId,
        title: payload.title || 'Nova anotação',
        content: payload.content || '',
        pinned: false,
        visibility: payload.visibility || 'org',
        author_id: user?.id,
        last_edited_by: user?.id,
        project_id: payload.project_id || null,
      })
      .select('*, profiles:author_id(name, avatar), editor:last_edited_by(name, avatar)')
      .single()
    if (!error && data) {
      setNotes(prev => [data, ...prev])
      await logActivity(orgId, user?.id, 'created', 'note', data.id, data.title)
    }
    return { data, error }
  }

  async function updateNote(id, payload) {
    const current = notes.find(n => n.id === id)
    const { data, error } = await supabase.from('notes')
      .update({ ...payload, last_edited_by: user?.id })
      .eq('id', id)
      .select('*, profiles:author_id(name, avatar), editor:last_edited_by(name, avatar)')
      .single()
    if (!error && data) {
      setNotes(prev => prev.map(n => n.id === id ? data : n))
      const action = payload.visibility && payload.visibility !== current?.visibility
        ? 'visibility_changed'
        : 'note_edited'
      await logActivity(orgId, user?.id, action, 'note', id, data.title,
        action === 'visibility_changed'
          ? { from: current?.visibility, to: payload.visibility }
          : { fields: Object.keys(payload) }
      )
    }
    return { data, error }
  }

  async function deleteNote(id) {
    const target = notes.find(n => n.id === id)
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) {
      setNotes(prev => prev.filter(n => n.id !== id))
      await logActivity(orgId, user?.id, 'deleted', 'note', id, target?.title)
    }
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
      .select('*, groups(id, name, color), profiles:author_id(name, avatar), editor:last_edited_by(name, avatar)')
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
      .insert({
        group_id: groupId,
        org_id: orgId,
        title,
        content: '',
        pinned: false,
        visibility: extraPayload.visibility || 'org',
        author_id: user?.id,
        last_edited_by: user?.id,
        project_id: projectId || null,
        ...extraPayload,
      })
      .select('*, groups(id, name, color), profiles:author_id(name, avatar), editor:last_edited_by(name, avatar)')
      .single()
    if (!error && data) {
      setNotes(prev => [data, ...prev])
      await logActivity(orgId, user?.id, 'created', 'note', data.id, data.title)
    }
    return { data, error }
  }

  async function updateNote(id, payload) {
    const current = notes.find(n => n.id === id)
    const { data, error } = await supabase.from('notes')
      .update({ ...payload, last_edited_by: user?.id })
      .eq('id', id)
      .select('*, groups(id, name, color), profiles:author_id(name, avatar), editor:last_edited_by(name, avatar)')
      .single()
    if (!error && data) {
      setNotes(prev => prev.map(n => n.id === id ? data : n))
      const action = payload.visibility && payload.visibility !== current?.visibility
        ? 'visibility_changed'
        : 'note_edited'
      await logActivity(orgId, user?.id, action, 'note', id, data.title,
        action === 'visibility_changed'
          ? { from: current?.visibility, to: payload.visibility }
          : { fields: Object.keys(payload) }
      )
    }
    return { data, error }
  }

  async function deleteNote(id) {
    const target = notes.find(n => n.id === id)
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) {
      setNotes(prev => prev.filter(n => n.id !== id))
      await logActivity(orgId, user?.id, 'deleted', 'note', id, target?.title)
    }
    return { error }
  }

  async function togglePin(id, pinned) { return updateNote(id, { pinned: !pinned }) }

  return { notes, loading, createNote, updateNote, deleteNote, togglePin, refresh: fetchAll }
}
