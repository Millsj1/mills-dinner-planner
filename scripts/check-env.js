#!/usr/bin/env node
// Pre-build sanity check. Runs before `vite build` so a misconfigured Vercel
// deploy fails loudly at build time instead of shipping a broken page that
// surfaces "Failed to fetch" in production.

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

const missing = []
if (!url) missing.push('VITE_SUPABASE_URL')
if (!key) missing.push('VITE_SUPABASE_ANON_KEY')

if (missing.length) {
  console.error('\n[check-env] ❌ Missing required env var(s):', missing.join(', '))
  console.error('[check-env] On Vercel: Project Settings → Environment Variables → add for Production, then redeploy.\n')
  process.exit(1)
}

// Echo the URL (not the key) so it shows up in Vercel build logs and the
// project ref typo we hit before would be visible at a glance.
console.log(`[check-env] ✓ VITE_SUPABASE_URL = ${url}`)
const keyKind = key.startsWith('sb_publishable_')
  ? 'publishable (new)'
  : key.startsWith('eyJ') ? 'anon JWT (legacy)' : 'unknown format'
console.log(`[check-env] ✓ VITE_SUPABASE_ANON_KEY format: ${keyKind}, length ${key.length}`)
