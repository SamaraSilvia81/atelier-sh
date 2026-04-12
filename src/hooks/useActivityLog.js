import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useActivityLog(orgId, { limit = 50, entityType = null, entityId = null } = {}) {
  
  const { user } = useAuth(); // O 'user' agora será usado nas dependências
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [unavailable, setUnavailable] = useState(false);

  // 1. Função de carga memoizada
  const fetchLogs = useCallback(async (currentOffset, isInitial = false) => {
    // Verificamos orgId e user para garantir que a query só rode se houver sessão
    if (!orgId || !user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      let q = supabase
        .from('activity_log')
        .select('*, profiles(name, avatar)')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + limit - 1);

      if (entityType) q = q.eq('entity_type', entityType);
      if (entityId) q = q.eq('entity_id', entityId);

      const { data, error } = await q;

      if (error) {
        if (['42P01', 'PGRST116', '42501'].includes(error.code)) {
          setUnavailable(true);
          setLogs([]);
        }
        return;
      }

      const newLogs = data || [];
      setLogs(prev => (isInitial ? newLogs : [...prev, ...newLogs]));
      setHasMore(newLogs.length === limit);
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
    } finally {
      setLoading(false);
    }
    // Incluímos user?.id para que se o usuário mudar, a função seja recriada
  }, [orgId, user?.id, entityType, entityId, limit]);

  // 2. Efeito para disparar a carga inicial
  // O erro de "cascading renders" sumirá aqui porque fetchLogs está isolado
  useEffect(() => {
    setOffset(0);
    setUnavailable(false);
    fetchLogs(0, true);
  }, [fetchLogs]);

  const loadMore = () => {
    if (loading || !hasMore) return;
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    fetchLogs(nextOffset, false);
  };

  const refresh = () => {
    setOffset(0);
    setUnavailable(false);
    fetchLogs(0, true);
  };

  return { logs, loading, hasMore, unavailable, loadMore, refresh };
}

/**
 * Tradutores de labels para a UI
 */
export function actionLabel(action) {
  const labels = {
    created: 'criou',
    updated: 'atualizou',
    deleted: 'removeu',
    invited: 'convidou',
    role_changed: 'alterou cargo',
    note_edited: 'editou nota',
    permission_changed: 'alterou permissão',
    status_changed: 'alterou status',
    visibility_changed: 'alterou visibilidade',
  };
  return labels[action] || action;
}

export function entityLabel(type) {
  const labels = {
    organization: 'organização',
    project: 'projeto',
    group: 'grupo',
    note: 'nota',
    member: 'membro',
    invite: 'convite',
    permission: 'permissão',
  };
  return labels[type] || type;
}

/**
 * Utilitário para registrar logs
 */
export async function logActivity(orgId, userId, action, entityType, entityId, entityName, meta = {}) {
  if (!orgId || !userId) return;
  try {
    await supabase.from('activity_log').insert({
      org_id: orgId,
      user_id: userId,
      action: action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      meta: meta,
    });
  } catch (err) {
    console.warn('Erro ao salvar log:', err);
  }
}