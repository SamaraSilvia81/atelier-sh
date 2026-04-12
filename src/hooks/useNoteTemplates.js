import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { logActivity } from './useActivityLog';

export function useNoteTemplates(orgId) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!orgId) return; // sem setState aqui — caso vazio tratado no return abaixo

    let cancelled = false;

    // tudo dentro do .then() → assíncrono, sem setState síncrono no body
    supabase
      .from('note_templates')
      .select('*, profiles:created_by(name, avatar)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[useNoteTemplates] fetchTemplates error:', error.message);
          setTemplates([]);
        } else {
          setTemplates(data || []);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [orgId, refreshKey]);

  async function saveAsTemplate({ title, content }) {
    setSaveError(null);

    const { data, error } = await supabase
      .from('note_templates')
      .insert({
        org_id:     orgId,
        title:      title || 'Template sem título',
        content:    content || '',
        created_by: user?.id,
      })
      .select('*, profiles:created_by(name, avatar)')
      .single();

    if (error) {
      console.error('[useNoteTemplates] saveAsTemplate error:', error.message);
      setSaveError(error.message);
      return { data: null, error };
    }

    setTemplates(prev => [data, ...prev]);
    await logActivity(orgId, user?.id, 'created', 'note_template', data.id, data.title);
    return { data, error: null };
  }

  async function deleteTemplate(id) {
    const target = templates.find(t => t.id === id);
    const { error } = await supabase.from('note_templates').delete().eq('id', id);
    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      await logActivity(orgId, user?.id, 'deleted', 'note_template', id, target?.title);
    }
    return { error };
  }

  return {
    templates:  orgId ? templates : [],  // sem orgId → derivado, sem setState
    loading:    orgId ? loading   : false,
    saveError,
    saveAsTemplate,
    deleteTemplate,
    refresh: () => setRefreshKey(k => k + 1), // força re-fetch sem useCallback
  };
}