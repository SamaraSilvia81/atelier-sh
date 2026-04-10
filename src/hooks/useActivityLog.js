import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// ─── hook principal ──────────────────────────────────────────────────────────
export function useActivityLog(orgId, { limit = 50, entityType = null, entityId = null } = {}) {
  const { user }     = useAuth()
  const [logs,       setLogs]    = useState([])
  const [loading,    setLoading] = useState(true)
  const [hasMore,    setHasMore] = useState(false)
  const [offset,     setOffset]  = useState(0)

  useEffect(() => {
    if (!orgId) { setLogs([]); setLoading(false); return }
    setOffset(0)
    load(0)
  }, [orgId, entityType, entityId])

  const load = useCallback(async (off = 0) => {
    if (!orgId) return
    setLoading(true)
    let q = supabase
      .from('activity_log')
      .select('*, profiles(name, avatar)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(off, off + limit - 1)

    if (entityType) q = q.eq('entity_type', entityType)
    if (entityId)   q = q.eq('entity_id',   entityId)

    const { data, error } = await q
    if (!error) {
      if (off === 0) setLogs(data || [])
      else           setLogs(prev => [...prev, ...(data || [])])
      setHasMore((data || []).length === limit)
    }
    setLoading(false)
  }, [orgId, entityType, entityId, limit])

  function loadMore() {
    const next = offset + limit
    setOffset(next)
    load(next)
  }

  return { logs, loading, hasMore, loadMore, refresh: () => { setOffset(0); load(0) } }
}

// ─── função utilitária para registrar ações (use nos hooks existentes) ───────
export async function logActivity(orgId, userId, action, entityType, entityId, entityName, meta = {}) {
  if (!orgId || !userId) return
  await supabase.from('activity_log').insert({
    org_id: orgId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    meta,
  })
}

// ─── labels legíveis por humanos ─────────────────────────────────────────────
export function actionLabel(action, entityType) {
  const map = {
    created:            'criou',
    updated:            'atualizou',
    deleted:            'deletou',
    invited:            'convidou',
    role_changed:       'alterou a role de',
    note_edited:        'editou a nota',
    permission_changed: 'alterou permissões de',
    status_changed:     'mudou o status de',
    visibility_changed: 'alterou visibilidade de',
  }
  return map[action] || action
}

export function entityLabel(entityType) {
  const map = {
    organization: 'organização',
    project:      'projeto',
    group:        'grupo',
    note:         'nota',
    member:       'membro',
    invite:       'convite',
    permission:   'permissão',
  }
  return map[entityType] || entityType
}
// ─── labels legíveis por humanos ─────────────────────────────────────────────
export function actionLabel(action) {
  const map = {
    created:            'criou',
    updated:            'atualizou',
    deleted:            'deletou',
    invited:            'convidou',
    role_changed:       'alterou a role de',
    note_edited:        'editou a nota',
    permission_changed: 'alterou permissões de',
    status_changed:     'mudou o status de',
    visibility_changed: 'alterou visibilidade de',
  }
  return map[action] || action
}

export function entityLabel(entityType) {
  const map = {
    organization: 'organização',
    project:      'projeto',
    group:        'grupo',
    note:         'nota',
    member:       'membro',
    invite:       'convite',
    permission:   'permissão',
  }
  return map[entityType] || entityType
}
