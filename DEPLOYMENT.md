# Mills Dinner Planner — Deployment Guide (Phase 2: multi-user)

This guide takes the planner from localStorage-only to a shared, multi-user app on Supabase + Vercel. It mirrors the Mills Family Asset Inventory deploy pattern you already run.

## What you need
- A Supabase account (you already have one for the asset inventory — same login works)
- A GitHub login on Vercel (you already have one)
- ~20 minutes

## Step 1 — Create the Supabase project

1. Go to https://supabase.com → **New project**
2. Name: `mills-dinner-planner`
3. Database password: generate a strong one, save in 1Password
4. Region: **West US (North California)**
5. Wait ~2 minutes for provisioning

## Step 2 — Run the migrations (in order)

In Supabase dashboard → **SQL Editor** → **New query**:

1. Open `supabase/migrations/001_initial_schema.sql` from the repo and paste the entire contents → **Run**
2. New query → paste `supabase/migrations/002_seed_recipes.sql` → **Run**

You should see ~33 recipe rows when you open the **Table Editor → recipes**.

## Step 3 — Enable Google OAuth (optional but recommended)

In Supabase → **Authentication → Providers → Google**, follow the OAuth setup. You can copy the same client ID as the Asset Inventory if you want to reuse it (just add the new redirect URLs).

## Step 4 — Get your API keys

In Supabase → **Project Settings → API**, copy:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public key** → `VITE_SUPABASE_ANON_KEY`

(Don't copy the service_role key — never used client-side.)

## Step 5 — Push code & deploy to Vercel

```bash
cd ~/Developer-projects/mills-dinner-planner
git add .
git commit -m "Phase 2: Supabase auth, shared plan, members"
git push
```

In Vercel → your existing `mills-dinner-planner` project → **Settings → Environment Variables**:
- `VITE_SUPABASE_URL` = Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = anon key

Then **Redeploy** (Vercel will auto-deploy from the push, but the env vars only apply on the next build — trigger a redeploy from the dashboard if needed).

## Step 6 — Add your Vercel URL to Supabase auth allowlist

In Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://mills-dinner-planner.vercel.app`
- **Redirect URLs:** add `https://mills-dinner-planner.vercel.app/**`

## Step 7 — Create the Mills household & make Jim the owner

1. Open the app, sign in as Jim (magic link or Google).
2. You'll land on a "Your account isn't part of a household yet" screen — that's expected.
3. Open Supabase → **Authentication → Users** and copy Jim's user ID (UUID).
4. In **SQL Editor**, run:

```sql
-- Create the household
insert into households (name, settings) values (
  'Mills Family',
  '{"currency": "USD"}'::jsonb
);

-- Make Jim the owner (replace the UUID and email)
insert into household_members (household_id, user_id, display_name, email, role)
values (
  (select id from households where name = 'Mills Family'),
  'JIM_USER_ID_FROM_AUTH_USERS',
  'Jim',
  'jimmills4@gmail.com',
  'owner'
);
```

5. Refresh the app — you should now see the planner with a freshly generated 2-week plan.

## Step 8 — Invite Shannon (and others)

1. In the app → **Members** tab.
2. Fill in name, email, role (Member or Viewer) → **Create invitation**.
3. The invite appears in **Pending invitations** with a **Copy link** button.
4. Send Shannon the copied link via text/iMessage.
5. She clicks the link, signs in with the matching email, and is added automatically.

Repeat for any other family members.

## Roles

- **Owner** — full access: edit plan, manage members, delete history
- **Member** — full access: edit plan, rate meals, add notes; cannot manage members
- **Viewer** — read-only

## Cost

$0/month on free tiers (Supabase + Vercel). Same projection as the Asset Inventory.

## Keep-alive (prevents Supabase pause)

If you already have a cron-job.org account from the Asset Inventory, add a second job pointing at this project's REST endpoint every 5 days:

- URL: `https://YOUR_REF.supabase.co/rest/v1/recipes?select=id&limit=1`
- Header: `apikey: YOUR_ANON_KEY`

## Migrations

| File | What it does |
|------|--------------|
| `001_initial_schema.sql` | households, members, invitations, recipes, meal_plans, meal_plan_items, meal_history; RLS policies; `accept_invitation()` RPC |
| `002_seed_recipes.sql` | Seeds the global recipe library (~33 recipes) |
