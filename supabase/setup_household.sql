-- =============================================================================
-- One-time setup: create the Mills household and make Jim the owner.
-- Run this in Supabase SQL Editor AFTER:
--   1. Migrations 001 and 002 have been run
--   2. Jim has signed into the deployed app at least once (creates an auth.users row)
--
-- Step 1: get Jim's auth user id. Run this first by itself:
--
--   select id, email, created_at
--   from auth.users
--   where email = 'jimmills4@gmail.com'
--   order by created_at desc
--   limit 1;
--
-- Step 2: paste Jim's id into the placeholder below, then run the whole script.
-- =============================================================================

-- Create the household (idempotent — won't duplicate if you re-run).
insert into households (name, settings)
select 'Mills Family', '{"currency": "USD"}'::jsonb
where not exists (select 1 from households where name = 'Mills Family');

-- Promote Jim to owner.
-- Replace 'JIM_USER_ID_HERE' with the UUID you copied from auth.users.
insert into household_members (household_id, user_id, display_name, email, role)
select
  (select id from households where name = 'Mills Family' limit 1),
  'JIM_USER_ID_HERE'::uuid,
  'Jim',
  'jimmills4@gmail.com',
  'owner'
where not exists (
  select 1 from household_members
  where user_id = 'JIM_USER_ID_HERE'::uuid
);

-- Verify
select
  hm.display_name,
  hm.role,
  h.name as household,
  hm.email
from household_members hm
join households h on h.id = hm.household_id
order by hm.joined_at;
