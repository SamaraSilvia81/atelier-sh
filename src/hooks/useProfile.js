import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (data) setProfile(data)
    setLoading(false)
  }

  async function saveProfile(payload) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...payload })
      .select()
      .single()
    if (!error && data) setProfile(data)
    return { data, error }
  }

  return { profile, loading, saveProfile }
}
