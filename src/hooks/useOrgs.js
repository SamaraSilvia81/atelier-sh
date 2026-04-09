import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { logActivity } from './useActivityLog'

export function useOrgs() {
  const { user } = useAuth()
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchOrgs()
  }, [user])

  async function fetchOrgs() {
    setLoading(true)
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: true })
    setOrgs(data || [])
    setLoading(false)
  }

  async function createOrg(payload) {
    const slug = payload.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const { data, error } = await supabase
      .from('organizations')
      .insert({ ...payload, slug, owner_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setOrgs(prev => [...prev, data])
      await logActivity(data.id, user.id, 'created', 'organization', data.id, data.name)
    }
    return { data, error }
  }

  async function updateOrg(id, payload) {
    const current = orgs.find(o => o.id === id)
    const { data, error } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setOrgs(prev => prev.map(o => o.id === id ? data : o))
      const action = payload.visibility && payload.visibility !== current?.visibility
        ? 'visibility_changed'
        : 'updated'
      const meta = action === 'visibility_changed'
        ? { from: current?.visibility, to: payload.visibility }
        : { fields: Object.keys(payload) }
      await logActivity(id, user.id, action, 'organization', id, data.name, meta)
    }
    return { data, error }
  }

  async function deleteOrg(id) {
    const { error } = await supabase.from('organizations').delete().eq('id', id)
    if (!error) setOrgs(prev => prev.filter(o => o.id !== id))
    return { error }
  }

  return { orgs, loading, createOrg, updateOrg, deleteOrg, refresh: fetchOrgs }
}
