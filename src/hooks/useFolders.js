import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// ─── useFolders ──────────────────────────────────────────────────────────────
// Pastas de anotações por grupo.
// groupId: UUID do grupo | null → retorna vazio sem query
// orgId:   UUID da org   (necessário para insert)
export function useFolders(groupId, orgId) {
  const { user } = useAuth()
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) { setFolders([]); setLoading(false); return }
    fetchFolders()
  }, [groupId])

  async function fetchFolders() {
    setLoading(true)
    const { data } = await supabase
      .from('note_folders')
      .select('*')
      .eq('group_id', groupId)
      .order('name')
    setFolders(data || [])
    setLoading(false)
  }

  async function createFolder(name) {
    const trimmed = name.trim()
    if (!trimmed) return { data: null, error: 'nome vazio' }
    const { data, error } = await supabase
      .from('note_folders')
      .insert({ group_id: groupId, org_id: orgId, name: trimmed, created_by: user?.id })
      .select('*')
      .single()
    if (!error && data) {
      setFolders(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'pt')))
    }
    return { data, error }
  }

  async function renameFolder(id, name) {
    const trimmed = name.trim()
    if (!trimmed) return { error: 'nome vazio' }
    const { data, error } = await supabase
      .from('note_folders')
      .update({ name: trimmed })
      .eq('id', id)
      .select('*')
      .single()
    if (!error && data) {
      setFolders(prev =>
        prev.map(f => f.id === id ? data : f).sort((a, b) => a.name.localeCompare(b.name, 'pt'))
      )
    }
    return { data, error }
  }

  // Ao deletar pasta, as notas dentro ficam com folder_id = null (ON DELETE SET NULL no banco)
  async function deleteFolder(id) {
    const { error } = await supabase.from('note_folders').delete().eq('id', id)
    if (!error) setFolders(prev => prev.filter(f => f.id !== id))
    return { error }
  }

  return { folders, loading, createFolder, renameFolder, deleteFolder, refresh: fetchFolders }
}