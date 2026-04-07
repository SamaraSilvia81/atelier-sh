import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn         = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp         = (email, password) => supabase.auth.signUp({ email, password })
  const signInWithGoogle = () => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })
  const signOut = () => supabase.auth.signOut()

  // 'owner' | 'admin' | 'member' | 'viewer' | null
  const getMyRole = useCallback(async (orgId) => {
    if (!orgId || !user) return null
    const { data, error } = await supabase.rpc('get_my_role', { p_org_id: orgId })
    if (error) return null
    return data
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut, getMyRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
