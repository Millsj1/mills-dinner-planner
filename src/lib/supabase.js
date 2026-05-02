import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Accepts either the legacy anon JWT (starts with "eyJ...") or the new
// publishable key (starts with "sb_publishable_..."). Both work with
// createClient — Supabase auto-detects the format.
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseKey && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ')
  // eslint-disable-next-line no-console
  console.error(
    `[Mills Dinner] Missing Supabase env var(s): ${missing}.\n` +
    `Locally: add to .env.local and RESTART \`npm run dev\` (Vite reads env at startup).\n` +
    `On Vercel: Project Settings → Environment Variables, then redeploy.`
  )
  throw new Error(`Supabase configuration missing: ${missing}`)
}

if (import.meta.env.DEV) {
  const keyKind = supabaseKey.startsWith('sb_publishable_')
    ? 'publishable (new)'
    : supabaseKey.startsWith('eyJ')
      ? 'anon JWT (legacy)'
      : 'unknown format'
  // eslint-disable-next-line no-console
  console.info(`[Mills Dinner] Supabase configured: ${supabaseUrl} · key type: ${keyKind}`)
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export const ROLES = { OWNER: 'owner', MEMBER: 'member', VIEWER: 'viewer' }
export const HAS_SUPABASE_BACKEND = true
