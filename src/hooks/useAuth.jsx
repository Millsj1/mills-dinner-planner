import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]     = useState(null)
  const [member, setMember]       = useState(null)
  const [household, setHousehold] = useState(null)
  const [loading, setLoading]     = useState(true)

  const loadMembership = useCallback(async (userId) => {
    const { data: mem } = await supabase
      .from('household_members')
      .select('*, household:households(*)')
      .eq('user_id', userId)
      .maybeSingle()

    if (mem) {
      setMember(mem)
      setHousehold(mem.household)
    } else {
      setMember(null)
      setHousehold(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadMembership(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadMembership(session.user.id)
      else { setMember(null); setHousehold(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [loadMembership])

  async function signInWithEmail(email) {
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
  }

  async function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setMember(null)
    setHousehold(null)
  }

  const isOwner  = member?.role === 'owner'
  const isMember = member?.role === 'member' || isOwner
  const canEdit  = isMember

  return (
    <AuthContext.Provider value={{
      session, member, household, loading,
      isOwner, isMember, canEdit,
      signInWithEmail, signInWithGoogle, signOut,
      reloadMembership: () => session && loadMembership(session.user.id),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
