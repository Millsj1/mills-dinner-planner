import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Reads the ?invite=TOKEN query param. After the user signs in, calls the
// `accept_invitation` RPC which creates their household_members row if their
// email matches the invitation. Then reloads membership.
export function useAcceptInvite() {
  const { session, member, reloadMembership } = useAuth()
  const [status, setStatus] = useState('idle') // idle | claiming | done | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!session || member) return
    const url = new URL(window.location.href)
    const token = url.searchParams.get('invite')
    if (!token) return

    let cancelled = false
    async function run() {
      setStatus('claiming')
      const { data, error } = await supabase.rpc('accept_invitation', { p_token: token })
      if (cancelled) return
      if (error) {
        setStatus('error')
        setMessage(error.message)
        return
      }
      // Strip the invite param from the URL so refresh doesn't re-attempt.
      url.searchParams.delete('invite')
      window.history.replaceState({}, '', url.toString())
      setStatus('done')
      setMessage(data?.message || 'Joined household')
      await reloadMembership()
    }
    run()
    return () => { cancelled = true }
  }, [session, member, reloadMembership])

  return { status, message }
}
