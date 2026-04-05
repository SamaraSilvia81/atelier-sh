import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

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
    if (!error) setOrgs(prev => [...prev, data])
    return { data, error }
  }

  async function updateOrg(id, payload) {
    const { data, error } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (!error) setOrgs(prev => prev.map(o => o.id === id ? data : o))
    return { data, error }
  }

  async function deleteOrg(id) {
    const { error } = await supabase.from('organizations').delete().eq('id', id)
    if (!error) setOrgs(prev => prev.filter(o => o.id !== id))
    return { error }
  }

  return { orgs, loading, createOrg, updateOrg, deleteOrg, refresh: fetchOrgs }
}
