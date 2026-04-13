import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// ─── useFolders ───────────────────────────────────────────────────────────────
// Suporte a pastas aninhadas via parent_id (migration v12).
// groupId: UUID do grupo | null → retorna vazio sem query
// orgId:   UUID da org (necessário para insert)
export function useFolders(groupId, orgId) {
  const { user }    = useAuth()
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!groupId) return   // sem setState aqui — caso vazio tratado no return abaixo

    let cancelled = false
    supabase
      .from('note_folders')
      .select('*')
      .eq('group_id', groupId)
      .order('name')
      .then(({ data }) => {
        if (!cancelled) setFolders(data || [])
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [groupId])

  // ── Helpers de árvore ──────────────────────────────────────────────────────
  // Retorna apenas pastas raiz (sem pai)
  const rootFolders = folders.filter(f => !f.parent_id)
  // Retorna filhas diretas de uma pasta
  const childrenOf  = (parentId) => folders.filter(f => f.parent_id === parentId)
  // Constrói árvore recursiva: [{ folder, children: [...] }]
  function buildTree(parentId = null) {
    return folders
      .filter(f => (f.parent_id ?? null) === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'))
      .map(folder => ({ folder, children: buildTree(folder.id) }))
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async function createFolder(name, parentId = null) {
    const trimmed = name.trim()
    if (!trimmed) return { data: null, error: 'nome vazio' }
    const { data, error } = await supabase
      .from('note_folders')
      .insert({
        group_id:   groupId,
        org_id:     orgId,
        name:       trimmed,
        parent_id:  parentId || null,
        created_by: user?.id,
      })
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

  // Ao deletar pasta, as notas ficam com folder_id = null (ON DELETE SET NULL no banco)
  // Subpastas também são deletadas (ON DELETE CASCADE)
  async function deleteFolder(id) {
    const { error } = await supabase.from('note_folders').delete().eq('id', id)
    if (!error) {
      // remove a pasta e todas as subpastas da lista local
      const idsToRemove = new Set()
      const collect = (fid) => {
        idsToRemove.add(fid)
        folders.filter(f => f.parent_id === fid).forEach(f => collect(f.id))
      }
      collect(id)
      setFolders(prev => prev.filter(f => !idsToRemove.has(f.id)))
    }
    return { error }
  }

  async function moveFolder(id, newParentId) {
    const { data, error } = await supabase
      .from('note_folders')
      .update({ parent_id: newParentId || null })
      .eq('id', id)
      .select('*')
      .single()
    if (!error && data) {
      setFolders(prev => prev.map(f => f.id === id ? data : f))
    }
    return { data, error }
  }

  return {
    folders,
    loading,
    rootFolders,
    childrenOf,
    buildTree,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
  }
}
