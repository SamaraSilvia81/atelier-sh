import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const DEFAULTS = {
  github_token:   '',
  trello_token:   '',
  figma_token:    '',
  sounds_enabled: true,
  sounds_volume:  0.5,
  proxy_url:      'https://atelier-sh-proxy.onrender.com',
}

// Cache local — só pra libs externas (github.js, trello.js) lerem sem context
// Os tokens VIVEM no Supabase — isso é só espelho de sessão
function cacheLocally(s) {
  try {
    if (s.github_token  !== undefined) localStorage.setItem('atelier_github_token',  s.github_token)
    if (s.trello_token  !== undefined) localStorage.setItem('atelier_trello_token',  s.trello_token)
    if (s.figma_token   !== undefined) localStorage.setItem('atelier_figma_token',   s.figma_token)
    if (s.proxy_url     !== undefined) localStorage.setItem('atelier_proxy_url',     s.proxy_url)
  } catch {}
}

function clearLocalCache() {
  try {
    ['atelier_github_token','atelier_trello_token','atelier_figma_token','atelier_proxy_url']
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}

export function useSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (!user) { clearLocalCache(); return }
    load()
  }, [user?.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .maybeSingle()

    const merged = { ...DEFAULTS, ...(data?.settings || {}) }
    setSettings(merged)
    cacheLocally(merged)   // espelha na sessão pra libs externas
    setLoading(false)
  }

  const save = useCallback(async (partial) => {
    setSaving(true)
    const next = { ...settings, ...partial }
    setSettings(next)
    cacheLocally(next)

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, settings: next }, { onConflict: 'id' })

    if (error) console.error('[useSettings] save error:', error)
    setSaving(false)
    return !error
  }, [settings, user?.id])

  return { settings, loading, saving, save }
}
