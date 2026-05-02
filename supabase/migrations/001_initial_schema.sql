-- =============================================================================
-- Mills Dinner Planner — Initial Schema
-- Migration: 001_initial_schema.sql
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- HOUSEHOLDS
-- =============================================================================
create table households (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  settings     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- =============================================================================
-- HOUSEHOLD MEMBERS
-- =============================================================================
create table household_members (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  display_name   text not null,
  email          text not null,
  role           text not null default 'member'
                   check (role in ('owner', 'member', 'viewer')),
  invited_by     uuid references auth.users(id),
  joined_at      timestamptz not null default now(),
  unique (household_id, user_id)
);

create index idx_household_members_household on household_members(household_id);
create index idx_household_members_user     on household_members(user_id);

-- =============================================================================
-- INVITATIONS
-- =============================================================================
create table invitations (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  invited_by     uuid not null references auth.users(id),
  email          text not null,
  display_name   text not null,
  role           text not null default 'member'
                   check (role in ('member', 'viewer')),
  token          text not null unique default encode(gen_random_bytes(32), 'hex'),
  accepted       boolean not null default false,
  expires_at     timestamptz not null default (now() + interval '14 days'),
  created_at     timestamptz not null default now()
);

create index idx_invitations_token       on invitations(token);
create index idx_invitations_household   on invitations(household_id);

-- =============================================================================
-- RECIPES
-- The master library. Plans pull from this table.
-- =============================================================================
create table recipes (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid references households(id) on delete cascade, -- null = global seed
  title             text not null,
  cuisine           text not null,
  meal_type         text not null check (meal_type in ('weeknight', 'weekend')),
  time_estimate     text not null,                 -- '25 min', '90 min', etc.
  tags              text[] not null default '{}',
  notes             text,
  ingredients       text[] not null default '{}',
  is_archived       boolean not null default false,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_recipes_household on recipes(household_id);
create index idx_recipes_active on recipes(household_id) where is_archived = false;
create index idx_recipes_meal_type on recipes(meal_type);

-- =============================================================================
-- MEAL PLANS
-- One row per generated 2-week plan.
-- =============================================================================
create table meal_plans (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  generated_at   timestamptz not null default now(),
  ended_at       timestamptz,
  is_active      boolean not null default true,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now()
);

create index idx_meal_plans_household on meal_plans(household_id);
create index idx_meal_plans_active on meal_plans(household_id) where is_active = true;

-- =============================================================================
-- MEAL PLAN ITEMS
-- One row per day in the plan (14 per plan).
-- =============================================================================
create table meal_plan_items (
  id              uuid primary key default gen_random_uuid(),
  meal_plan_id    uuid not null references meal_plans(id) on delete cascade,
  household_id    uuid not null references households(id) on delete cascade,
  recipe_id       uuid not null references recipes(id) on delete restrict,
  week            integer not null check (week in (1, 2)),
  day             text not null check (day in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  meal_type       text not null check (meal_type in ('weeknight', 'weekend')),
  title_snapshot  text not null,                 -- frozen copy in case recipe is later edited
  cooked          boolean not null default false,
  rating          integer check (rating between 0 and 5),
  shannons_notes  text,
  jims_notes      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (meal_plan_id, week, day)
);

create index idx_meal_plan_items_plan on meal_plan_items(meal_plan_id);
create index idx_meal_plan_items_household on meal_plan_items(household_id);

-- =============================================================================
-- MEAL HISTORY
-- Append-only ledger written when a plan rolls. Feeds rotation weights.
-- =============================================================================
create table meal_history (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references households(id) on delete cascade,
  recipe_id       uuid not null references recipes(id) on delete cascade,
  rating          integer check (rating between 0 and 5),
  cooked_date     timestamptz,
  shannons_notes  text,
  jims_notes      text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create index idx_meal_history_household on meal_history(household_id);
create index idx_meal_history_recipe on meal_history(recipe_id);

-- =============================================================================
-- updated_at TRIGGER
-- =============================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_updated_at
  before update on recipes
  for each row execute function set_updated_at();

create trigger meal_plan_items_updated_at
  before update on meal_plan_items
  for each row execute function set_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================
create or replace function my_household_id()
returns uuid language sql stable security definer as $$
  select household_id
  from household_members
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function my_role()
returns text language sql stable security definer as $$
  select role
  from household_members
  where user_id = auth.uid()
  limit 1;
$$;

-- accept_invitation: claim a pending invitation for the current user.
-- Matches by token AND email (case-insensitive). Creates household_members row.
create or replace function accept_invitation(p_token text)
returns json language plpgsql security definer as $$
declare
  v_invite invitations%rowtype;
  v_user   record;
  v_email  text;
  v_existing_member household_members%rowtype;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'message', 'Not signed in');
  end if;

  select * into v_user from auth.users where id = auth.uid();
  v_email := lower(coalesce(v_user.email, ''));

  select * into v_invite
  from invitations
  where token = p_token
    and accepted = false
    and expires_at > now();

  if not found then
    return json_build_object('ok', false, 'message', 'Invitation not found or expired');
  end if;

  if lower(v_invite.email) <> v_email then
    return json_build_object('ok', false, 'message', 'Invitation email does not match signed-in email');
  end if;

  -- Already a member? Just mark invite accepted.
  select * into v_existing_member
  from household_members
  where household_id = v_invite.household_id and user_id = auth.uid();

  if found then
    update invitations set accepted = true where id = v_invite.id;
    return json_build_object('ok', true, 'message', 'Already a member', 'household_id', v_invite.household_id);
  end if;

  insert into household_members (household_id, user_id, display_name, email, role, invited_by)
  values (v_invite.household_id, auth.uid(), v_invite.display_name, v_email, v_invite.role, v_invite.invited_by);

  update invitations set accepted = true where id = v_invite.id;

  return json_build_object('ok', true, 'message', 'Joined household', 'household_id', v_invite.household_id);
end;
$$;

grant execute on function accept_invitation(text) to authenticated;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table households        enable row level security;
alter table household_members enable row level security;
alter table invitations       enable row level security;
alter table recipes           enable row level security;
alter table meal_plans        enable row level security;
alter table meal_plan_items   enable row level security;
alter table meal_history      enable row level security;

-- households
create policy "Members can view their household"
  on households for select
  using (id = my_household_id());

create policy "Owners can update household settings"
  on households for update
  using (id = my_household_id() and my_role() = 'owner');

-- household_members
create policy "Members can view all members in their household"
  on household_members for select
  using (household_id = my_household_id());

create policy "Owners can insert new members"
  on household_members for insert
  with check (household_id = my_household_id() and my_role() = 'owner');

create policy "Owners can update member roles"
  on household_members for update
  using (household_id = my_household_id() and my_role() = 'owner');

create policy "Owners can remove members"
  on household_members for delete
  using (household_id = my_household_id() and my_role() = 'owner');

-- invitations
create policy "Members can view invitations"
  on invitations for select
  using (household_id = my_household_id());

create policy "Owners can create invitations"
  on invitations for insert
  with check (household_id = my_household_id() and my_role() = 'owner');

create policy "Owners can delete invitations"
  on invitations for delete
  using (household_id = my_household_id() and my_role() = 'owner');

-- recipes (global seeds: household_id is null and visible to everyone signed in;
-- household-owned recipes are scoped to that household)
create policy "Members can view recipes"
  on recipes for select
  using (
    household_id is null
    or household_id = my_household_id()
  );

create policy "Owners and members can add recipes"
  on recipes for insert
  with check (household_id = my_household_id() and my_role() in ('owner','member'));

create policy "Owners and members can edit recipes"
  on recipes for update
  using (household_id = my_household_id() and my_role() in ('owner','member'));

create policy "Owners and members can delete recipes"
  on recipes for delete
  using (household_id = my_household_id() and my_role() in ('owner','member'));

-- meal_plans
create policy "Members can view their plans"
  on meal_plans for select
  using (household_id = my_household_id());

create policy "Owners and members can create plans"
  on meal_plans for insert
  with check (household_id = my_household_id() and my_role() in ('owner','member'));

create policy "Owners and members can update plans"
  on meal_plans for update
  using (household_id = my_household_id() and my_role() in ('owner','member'));

create policy "Owners and members can delete plans"
  on meal_plans for delete
  using (household_id = my_household_id() and my_role() in ('owner','member'));

-- meal_plan_items
create policy "Members can view their plan items"
  on meal_plan_items for select
  using (household_id = my_household_id());

create policy "Owners and members can manage plan items"
  on meal_plan_items for insert
  with check (household_id = my_household_id() and my_role() in ('owner','member'));

create policy "Owners and members can update plan items"
  on meal_plan_items for update
  using (household_id = my_household_id() and my_role() in ('owner','member'));

create policy "Owners and members can delete plan items"
  on meal_plan_items for delete
  using (household_id = my_household_id() and my_role() in ('owner','member'));

-- meal_history
create policy "Members can view history"
  on meal_history for select
  using (household_id = my_household_id());

create policy "Owners and members can write history"
  on meal_history for insert
  with check (household_id = my_household_id() and my_role() in ('owner','member'));

create policy "Owners can delete history"
  on meal_history for delete
  using (household_id = my_household_id() and my_role() = 'owner');
