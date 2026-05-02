import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
)

export const ROLES = { OWNER: 'owner', MEMBER: 'member', VIEWER: 'viewer' }

// True only when both env vars are present — used to gate the auth UI vs.
// falling back to localStorage for local dev with no backend.
export const HAS_SUPABASE_BACKEND = Boolean(supabaseUrl && supabaseAnonKey)
