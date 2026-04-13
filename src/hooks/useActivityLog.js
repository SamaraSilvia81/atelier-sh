import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useActivityLog(orgId, { limit = 50, entityType = null, entityId = null } = {}) {
  const { user }   = useAuth()
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(false)
  const [hasMore, setHasMore]     = useState(false)
  const [offset, setOffset]       = useState(0)
  const [unavailable, setUnavailable] = useState(false)
  const [refreshKey, setRefreshKey]   = useState(0)

  // refs para evitar closure stale sem useCallback
  const paramsRef = useRef({ orgId, entityType, entityId, limit })
  useEffect(() => { paramsRef.current = { orgId, entityType, entityId, limit } })

  useEffect(() => {
    if (!orgId || !user) return

    let cancelled = false

    const { entityType: et, entityId: eid, limit: lim } = paramsRef.current

    let q = supabase
      .from('activity_log')
      .select('*, profiles(name, avatar)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(0, lim - 1)

    if (et)  q = q.eq('entity_type', et)
    if (eid) q = q.eq('entity_id', eid)

    q.then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        if (['42P01', 'PGRST116', '42501'].includes(error.code)) {
          setUnavailable(true)
          setLogs([])
        }
        setLoading(false)
        return
      }
      const newLogs = data || []
      setLogs(newLogs)
      setHasMore(newLogs.length === lim)
      setOffset(lim)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [orgId, user?.id, entityType, entityId, refreshKey])

  function loadMore() {
    if (loading || !hasMore || !orgId || !user) return

    let cancelled = false
    const { entityType: et, entityId: eid, limit: lim } = paramsRef.current

    let q = supabase
      .from('activity_log')
      .select('*, profiles(name, avatar)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + lim - 1)

    if (et)  q = q.eq('entity_type', et)
    if (eid) q = q.eq('entity_id', eid)

    q.then(({ data, error }) => {
      if (cancelled || error) return
      const more = data || []
      setLogs(prev => [...prev, ...more])
      setHasMore(more.length === lim)
      setOffset(prev => prev + lim)
    })

    return () => { cancelled = true }
  }

  function refresh() {
    setUnavailable(false)
    setLogs([])
    setOffset(0)
    setRefreshKey(k => k + 1)
  }

  return { logs, loading, hasMore, unavailable, loadMore, refresh }
}

// ── Labels para UI ────────────────────────────────────────────────────────────
export function actionLabel(action) {
  const labels = {
    created:            'criou',
    updated:            'atualizou',
    deleted:            'removeu',
    invited:            'convidou',
    role_changed:       'alterou cargo',
    note_edited:        'editou nota',
    permission_changed: 'alterou permissão',
    status_changed:     'alterou status',
    visibility_changed: 'alterou visibilidade',
  }
  return labels[action] || action
}

export function entityLabel(type) {
  const labels = {
    organization: 'organização',
    project:      'projeto',
    group:        'grupo',
    note:         'nota',
    member:       'membro',
    invite:       'convite',
    permission:   'permissão',
  }
  return labels[type] || type
}

// ── Utilitário para registrar logs ────────────────────────────────────────────
export async function logActivity(orgId, userId, action, entityType, entityId, entityName, meta = {}) {
  if (!orgId || !userId) return
  try {
    await supabase.from('activity_log').insert({
      org_id:      orgId,
      user_id:     userId,
      action,
      entity_type: entityType,
      entity_id:   entityId,
      entity_name: entityName,
      meta,
    })
  } catch (err) {
    console.warn('Erro ao salvar log:', err)
  }
}
