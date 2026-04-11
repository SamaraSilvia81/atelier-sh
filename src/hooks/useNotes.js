import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { logActivity } from './useActivityLog'

// Select com joins de autor/editor — graceful fallback se colunas não existem ainda
const SELECT_FULL   = '*, groups(id, name, color), profiles:author_id(name, avatar), editor:last_edited_by(name, avatar)'
const SELECT_SIMPLE = '*, groups(id, name, color)'
const SELECT_NOTE_FULL   = '*, profiles:author_id(name, avatar), editor:last_edited_by(name, avatar)'
const SELECT_NOTE_SIMPLE = '*'

// Tenta query com select rico; se 400, retorna com select simples
async function safeSelect(query, richSelect, fallbackSelect) {
  const { data, error } = await query.select(richSelect)
  if (error?.code === 'PGRST200' || (error && !data)) {
    const { data: d2 } = await query.select(fallbackSelect)
    return d2 || []
  }
  return data || []
}

// ─── useNotes (por grupo) ────────────────────────────────────────────────────
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
    let data
    const { data: d1, error: e1 } = await supabase
      .from('notes')
      .select(SELECT_NOTE_FULL)
      .eq('group_id', groupId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })

    if (e1 || !d1) {
      // fallback — colunas novas não existem ainda
      const { data: d2 } = await supabase
        .from('notes')
        .select(SELECT_NOTE_SIMPLE)
        .eq('group_id', groupId)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false })
      data = d2 || []
    } else {
      data = d1
    }
    setNotes(data)
    setLoading(false)
  }

  async function createNote(payload = {}) {
    // Tenta com colunas novas; se der erro, tenta sem
    const base = {
      group_id:   groupId,
      org_id:     orgId,
      title:      payload.title || 'Nova anotação',
      content:    payload.content || '',
      pinned:     false,
      project_id: payload.project_id || null,
      folder_id:  payload.folder_id || null,
    }

    // Tenta inserir com colunas v10
    let result = await supabase.from('notes')
      .insert({ ...base, visibility: payload.visibility || 'org', author_id: user?.id, last_edited_by: user?.id })
      .select(SELECT_NOTE_FULL)
      .single()

    // Fallback sem colunas novas
    if (result.error) {
      result = await supabase.from('notes')
        .insert(base)
        .select(SELECT_NOTE_SIMPLE)
        .single()
    }

    const { data, error } = result
    if (!error && data) {
      setNotes(prev => [data, ...prev])
      await logActivity(orgId, user?.id, 'created', 'note', data.id, data.title)
    }
    return { data, error }
  }

  async function updateNote(id, payload) {
    const current = notes.find(n => n.id === id)

    // Remove campos que podem não existir no banco
    const safePayload = { ...payload }
    let result = await supabase.from('notes')
      .update({ ...safePayload, last_edited_by: user?.id })
      .eq('id', id)
      .select(SELECT_NOTE_FULL)
      .single()

    // Fallback
    if (result.error) {
      const { last_edited_by, ...withoutNew } = safePayload
      result = await supabase.from('notes')
        .update(withoutNew)
        .eq('id', id)
        .select(SELECT_NOTE_SIMPLE)
        .single()
    }

    const { data, error } = result
    if (!error && data) {
      setNotes(prev => prev.map(n => n.id === id ? data : n))
      const action = payload.visibility && payload.visibility !== current?.visibility
        ? 'visibility_changed' : 'note_edited'
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

  async function duplicateNote(id) {
    const source = notes.find(n => n.id === id)
    if (!source) return { error: 'nota não encontrada' }
    return createNote({
      title: `${source.title || 'sem título'} (cópia)`,
      content: source.content,
      folder_id: source.folder_id,
      project_id: source.project_id,
      visibility: source.visibility,
    })
  }

  return { notes, loading, createNote, updateNote, deleteNote, togglePin, duplicateNote, refresh: fetchNotes }
}

// ─── useOrgNotes (todas as notas da org) ────────────────────────────────────
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

    const buildQuery = (sel) => {
      let q = supabase.from('notes').select(sel).eq('org_id', orgId)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false })
      if (projectId) q = q.eq('project_id', projectId)
      return q
    }

    const { data: d1, error: e1 } = await buildQuery(SELECT_FULL)
    if (e1 || !d1) {
      const { data: d2 } = await buildQuery(SELECT_SIMPLE)
      setNotes(d2 || [])
    } else {
      setNotes(d1)
    }
    setLoading(false)
  }

  async function createNote(groupId, title = 'Nova anotação', extraPayload = {}) {
    const base = {
      group_id: groupId, org_id: orgId, title,
      content: '', pinned: false,
      project_id: projectId || null,
    }

    let result = await supabase.from('notes')
      .insert({ ...base, visibility: extraPayload.visibility || 'org', author_id: user?.id, last_edited_by: user?.id, ...extraPayload })
      .select(SELECT_FULL).single()

    if (result.error) {
      const { visibility, author_id, last_edited_by, ...safeExtra } = extraPayload
      result = await supabase.from('notes')
        .insert({ ...base, ...safeExtra })
        .select(SELECT_SIMPLE).single()
    }

    const { data, error } = result
    if (!error && data) {
      setNotes(prev => [data, ...prev])
      await logActivity(orgId, user?.id, 'created', 'note', data.id, data.title)
    }
    return { data, error }
  }

  async function updateNote(id, payload) {
    const current = notes.find(n => n.id === id)

    let result = await supabase.from('notes')
      .update({ ...payload, last_edited_by: user?.id })
      .eq('id', id).select(SELECT_FULL).single()

    if (result.error) {
      const { last_edited_by, visibility, ...safePayload } = payload
      result = await supabase.from('notes')
        .update(safePayload).eq('id', id).select(SELECT_SIMPLE).single()
    }

    const { data, error } = result
    if (!error && data) {
      setNotes(prev => prev.map(n => n.id === id ? data : n))
      const action = payload.visibility && payload.visibility !== current?.visibility
        ? 'visibility_changed' : 'note_edited'
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

  async function duplicateNote(id) {
    const source = notes.find(n => n.id === id)
    if (!source) return { error: 'nota não encontrada' }
    const groupId = source.group_id
    return createNote(groupId, `${source.title || 'sem título'} (cópia)`, {
      content: source.content,
      folder_id: source.folder_id,
      project_id: source.project_id,
      visibility: source.visibility,
    })
  }

  async function saveAsOrgTemplate(id) {
    const source = notes.find(n => n.id === id)
    if (!source) return { error: 'nota não encontrada' }
    // Salva na tabela note_templates com escopo da org
    const { data, error } = await supabase.from('note_templates').insert({
      org_id: orgId,
      title: source.title || 'Template sem título',
      content: source.content,
      created_by: user?.id,
    }).select().single()
    if (!error) {
      await logActivity(orgId, user?.id, 'created', 'note_template', data.id, data.title)
    }
    return { data, error }
  }

  return { notes, loading, createNote, updateNote, deleteNote, togglePin, duplicateNote, saveAsOrgTemplate, refresh: fetchAll }
}