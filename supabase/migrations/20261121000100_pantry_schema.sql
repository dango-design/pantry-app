-- Pantry app: baseline schema
--
-- What this file creates
--   * Schema `pantry`: the eight pantry tables, their indexes, triggers and
--     row-level security policies, and the functions the app calls.
--   * Schema `pantry_private`: helper functions that the policies and the
--     functions above use, and the table `schema_migrations`, which lists the
--     pantry migration files that have been applied.
--   * Membership of four pantry tables in the `supabase_realtime` publication.
--
-- What this file touches
--   Only `pantry`, `pantry_private` and the `supabase_realtime` publication.
--   It creates nothing in the public schema, installs no extension, and adds
--   no trigger to the shared users table. Two pantry tables have a foreign key
--   to auth.users(id). Creating a foreign key takes a short lock on auth.users
--   that blocks writes to it until this file commits. If the lock cannot be
--   taken within 5 seconds the file fails and nothing is changed.
--
-- How to run it
--   Once, by hand, with scripts/db-apply.sh. The whole file is one
--   transaction. If any statement fails, nothing is changed. Running it a
--   second time fails at the first check and changes nothing.
--
-- New users
--   There is no sign-up trigger, because the project is shared and a trigger
--   on the users table would run for every app. The app calls
--   pantry.ensure_user_setup() after sign-in instead.
--
-- Rule for later migration files
--   Start with `begin;`, then a plain insert of the file's version into
--   pantry_private.schema_migrations (no `on conflict`), then the changes,
--   then `commit;`. The version is the primary key, so a second run fails at
--   the insert, before it changes anything.

begin;

-- Give up after 5 seconds instead of waiting for a lock. A waiting lock
-- request on auth.users would hold up sign-ins in every app.
set local lock_timeout = '5s';

-- ============================================================================
-- CHECKS BEFORE ANYTHING IS CREATED
-- ============================================================================

do $$
begin
    if exists (
        select 1
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('pantry', 'pantry_private')
    ) or exists (
        select 1
        from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('pantry', 'pantry_private')
    ) then
        raise exception 'Schema pantry or pantry_private already has objects in it. This baseline has been applied before, or the names are taken. Nothing was changed.';
    end if;

    if not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon')
        or not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated')
        or not exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role')
    then
        raise exception 'The roles anon, authenticated and service_role must exist. Is this a Supabase database?';
    end if;

    if pg_catalog.to_regclass('auth.users') is null
        or pg_catalog.to_regprocedure('auth.uid()') is null
        or pg_catalog.to_regprocedure('auth.jwt()') is null
    then
        raise exception 'auth.users, auth.uid() and auth.jwt() must exist. Is this a Supabase database?';
    end if;
end $$;

-- ============================================================================
-- SCHEMAS
-- ============================================================================

-- `pantry` is added to the API's exposed schemas, so the app can reach it.
-- `pantry_private` is not, so nothing in it can be called over the API.
create schema if not exists pantry;
create schema if not exists pantry_private;

-- ============================================================================
-- MIGRATION LEDGER
-- ============================================================================

-- One row per pantry migration file that has been applied. This repo does not
-- write to supabase_migrations.schema_migrations, because the other app in
-- this project owns that table.
create table pantry_private.schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
);

-- Row-level security with no policies: only the table owner and service_role
-- can read or write it.
alter table pantry_private.schema_migrations enable row level security;

-- ============================================================================
-- INVITE CODE GENERATOR
-- ============================================================================

-- Returns an invite code: 8 characters from an alphabet without 0/O or 1/I.
-- Created before the tables because pantry.households uses it as a column
-- default.
--
-- gen_random_uuid() is built into Postgres, so this needs no extension. Bytes
-- 6 and 8 of a UUID hold the version and variant bits, so they are skipped.
-- The bytes used are fully random, and 256 is a multiple of 32, so every
-- character is equally likely.
create function pantry_private.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
    v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_bytes bytea := uuid_send(gen_random_uuid());
    v_code text := '';
    i int;
begin
    foreach i in array array[0, 1, 2, 3, 4, 5, 9, 10] loop
        v_code := v_code || substr(v_chars, get_byte(v_bytes, i) % 32 + 1, 1);
    end loop;
    return v_code;
end;
$$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- One row per person who has opened the pantry app. The id is the person's
-- id in auth.users. An account that only uses another app in this project
-- has no row here.
create table pantry.user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null,
    avatar_url text,
    preferences jsonb default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Households. invite_code is what another person types to join.
create table pantry.households (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    invite_code text unique not null default pantry_private.generate_invite_code(),
    owner_id uuid not null references pantry.user_profiles(id),
    settings jsonb default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint households_invite_code_format check (invite_code ~ '^[A-HJ-NP-Z2-9]{8}$')
);

-- Which person belongs to which household, and with what role.
create table pantry.household_members (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references pantry.households(id) on delete cascade,
    user_id uuid not null references pantry.user_profiles(id) on delete cascade,
    role text not null check (role in ('owner', 'admin', 'member')),
    joined_at timestamptz default now(),
    unique (household_id, user_id)
);

-- Food items (the inventory)
create table pantry.food_items (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references pantry.households(id) on delete cascade,
    name text not null,
    category text not null,
    subcategory text,

    quantity decimal not null,
    quantity_unit text not null,
    original_quantity decimal not null,

    storage_location text not null,
    purchase_date date not null default current_date,
    expiration_date date not null,
    expiration_source text not null check (expiration_source in ('scanned', 'calculated', 'manual')),
    freshness_score integer default 100,

    barcode text,
    brand text,
    product_id text,

    image_url text,
    notes text,
    tags text[] default '{}',

    added_by uuid not null references pantry.user_profiles(id),
    added_via text not null check (added_via in ('photo', 'receipt', 'barcode', 'manual', 'voice')),

    status text not null default 'active' check (status in ('active', 'consumed', 'expired', 'discarded')),
    consumed_at timestamptz,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Shopping lists
create table pantry.shopping_lists (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references pantry.households(id) on delete cascade,
    name text not null,
    is_default boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Shopping list items
create table pantry.shopping_list_items (
    id uuid primary key default gen_random_uuid(),
    shopping_list_id uuid not null references pantry.shopping_lists(id) on delete cascade,
    name text not null,
    category text,
    quantity decimal,
    quantity_unit text,
    notes text,

    source text not null check (source in ('manual', 'low_stock', 'expiring', 'recipe', 'pattern')),
    source_item_id uuid,

    is_checked boolean default false,
    checked_by uuid references pantry.user_profiles(id),
    checked_at timestamptz,

    priority text default 'normal' check (priority in ('low', 'normal', 'high')),
    store text,
    aisle text,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Recipes. A row with no household_id is a built-in recipe.
create table pantry.recipes (
    id uuid default gen_random_uuid() primary key,
    household_id uuid references pantry.households(id) on delete cascade,
    name text not null,
    description text,

    ingredients jsonb not null default '[]'::jsonb,
    instructions text[] not null default '{}',

    prep_time_minutes integer,
    cook_time_minutes integer,
    servings integer,
    difficulty text check (difficulty in ('easy', 'medium', 'hard')),
    cuisine text,
    tags text[] not null default '{}',
    dietary_info text[] not null default '{}',

    image_url text,
    source_url text,

    is_favorite boolean not null default false,
    times_cooked integer not null default 0,
    last_cooked_at timestamptz,
    rating integer check (rating >= 1 and rating <= 5),
    notes text,

    source text not null default 'user' check (source in ('builtin', 'imported', 'user', 'ai_generated')),
    created_by uuid references auth.users(id),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Food usage log: one row each time an item is used, discarded or expires.
create table pantry.food_usage_log (
    id uuid primary key default gen_random_uuid(),
    food_item_id uuid not null references pantry.food_items(id) on delete cascade,
    household_id uuid not null references pantry.households(id) on delete cascade,
    user_id uuid not null references pantry.user_profiles(id),

    action text not null check (action in ('consumed', 'partial_use', 'discarded', 'expired', 'frozen')),
    quantity_changed decimal not null,
    quantity_remaining decimal not null,

    notes text,

    created_at timestamptz default now(),

    recipe_id uuid references pantry.recipes(id) on delete set null
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index idx_food_items_household on pantry.food_items (household_id);
create index idx_food_items_status on pantry.food_items (status);
create index idx_food_items_expiration on pantry.food_items (expiration_date);
create index idx_food_items_category on pantry.food_items (category);
create index idx_food_items_storage on pantry.food_items (storage_location);
create index idx_food_items_barcode on pantry.food_items (barcode);

create index idx_shopping_list_items_list on pantry.shopping_list_items (shopping_list_id);
create index idx_shopping_list_items_checked on pantry.shopping_list_items (is_checked);

create index idx_household_members_household on pantry.household_members (household_id);

-- A person belongs to at most one household. This index enforces it.
create unique index household_members_one_per_user on pantry.household_members (user_id);

create index idx_food_usage_log_item on pantry.food_usage_log (food_item_id);
create index idx_food_usage_log_household on pantry.food_usage_log (household_id);
create index idx_food_usage_log_recipe_id on pantry.food_usage_log (recipe_id) where recipe_id is not null;

create index idx_recipes_household_id on pantry.recipes (household_id);
create index idx_recipes_cuisine on pantry.recipes (cuisine) where cuisine is not null;
create index idx_recipes_difficulty on pantry.recipes (difficulty) where difficulty is not null;
create index idx_recipes_is_favorite on pantry.recipes (is_favorite) where is_favorite = true;

-- ============================================================================
-- HELPER FUNCTIONS USED BY THE POLICIES
-- ============================================================================

-- A policy on household_members cannot query household_members itself:
-- Postgres rejects that with "infinite recursion detected in policy". These
-- helpers are SECURITY DEFINER, so they read the tables without row-level
-- security, and the policies call them instead.

-- Whether the current user belongs to the household
create function pantry_private.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from pantry.household_members
        where household_id = p_household_id and user_id = (select auth.uid())
    );
$$;

-- Whether the current user is an owner or admin of the household
create function pantry_private.is_household_admin(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from pantry.household_members
        where household_id = p_household_id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
    );
$$;

-- Whether the current user is households.owner_id. Reads past the households
-- SELECT policy, so it works before the owner has a membership row.
create function pantry_private.owns_household(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from pantry.households
        where id = p_household_id and owner_id = (select auth.uid())
    );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Anyone signed in to any app in this project can call the pantry API. These
-- policies are what limit a person to their own household's rows.

alter table pantry.user_profiles enable row level security;
alter table pantry.households enable row level security;
alter table pantry.household_members enable row level security;
alter table pantry.food_items enable row level security;
alter table pantry.shopping_lists enable row level security;
alter table pantry.shopping_list_items enable row level security;
alter table pantry.food_usage_log enable row level security;
alter table pantry.recipes enable row level security;

-- User profiles
create policy "Users can view own profile" on pantry.user_profiles
    for select using (auth.uid() = id);

create policy "Users can insert own profile" on pantry.user_profiles
    for insert with check (auth.uid() = id);

create policy "Users can update own profile" on pantry.user_profiles
    for update using (auth.uid() = id);

-- Households
-- The owner can always see their household, so creating one with
-- insert().select() works before the owner has a membership row.
create policy "Members can view household" on pantry.households
    for select to authenticated using (
        owner_id = auth.uid()
        or pantry_private.is_household_member(id)
    );

create policy "Users can create households" on pantry.households
    for insert with check (auth.uid() = owner_id);

-- The owner cannot hand owner_id to someone else with a plain update. That
-- goes through transfer_household_ownership().
create policy "Owners can update household" on pantry.households
    for update to authenticated
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());

create policy "Owners can delete household" on pantry.households
    for delete using (owner_id = auth.uid());

-- Household members
-- Keep this policy free of subqueries. The DELETE policy on household_members
-- still looks up household_members, and Postgres raises infinite recursion if
-- the SELECT policy it triggers contains a subquery too.
create policy "Members can view household members" on pantry.household_members
    for select to authenticated using (
        user_id = auth.uid()
        or pantry_private.is_household_member(household_id)
    );

-- Nobody can add another person. The invite code is the only way in, through
-- join_household_by_invite(). What is allowed here is the owner adding their
-- own row to a household they just created, and the unique index on user_id
-- only lets that succeed when they are not in a household already.
create policy "Owners can add themselves to a new household" on pantry.household_members
    for insert to authenticated with check (
        user_id = auth.uid()
        and role = 'owner'
        and pantry_private.owns_household(household_id)
    );

-- household_members has no UPDATE policy. Roles change through
-- set_household_member_role() and transfer_household_ownership().

-- Like the SELECT policy, keep this free of subqueries
create policy "Owners/admins can remove members" on pantry.household_members
    for delete to authenticated using (
        -- Members can leave; the owner leaves through leave_household()
        (user_id = auth.uid() and not pantry_private.owns_household(household_id))
        -- The owner can remove anyone else
        or (user_id <> auth.uid() and pantry_private.owns_household(household_id))
        -- Admins can remove plain members
        or (role = 'member' and pantry_private.is_household_admin(household_id))
    );

-- Food items
create policy "Members can view food items" on pantry.food_items
    for select using (
        exists (
            select 1 from pantry.household_members
            where household_id = food_items.household_id and user_id = auth.uid()
        )
    );

create policy "Members can insert food items" on pantry.food_items
    for insert with check (
        exists (
            select 1 from pantry.household_members
            where household_id = food_items.household_id and user_id = auth.uid()
        )
        and added_by = auth.uid()
    );

create policy "Members can update food items" on pantry.food_items
    for update using (
        exists (
            select 1 from pantry.household_members
            where household_id = food_items.household_id and user_id = auth.uid()
        )
    );

create policy "Members can delete food items" on pantry.food_items
    for delete using (
        exists (
            select 1 from pantry.household_members
            where household_id = food_items.household_id and user_id = auth.uid()
        )
    );

-- Shopping lists
create policy "Members can view shopping lists" on pantry.shopping_lists
    for select using (
        exists (
            select 1 from pantry.household_members
            where household_id = shopping_lists.household_id and user_id = auth.uid()
        )
    );

create policy "Members can create shopping lists" on pantry.shopping_lists
    for insert with check (
        exists (
            select 1 from pantry.household_members
            where household_id = shopping_lists.household_id and user_id = auth.uid()
        )
    );

create policy "Members can update shopping lists" on pantry.shopping_lists
    for update using (
        exists (
            select 1 from pantry.household_members
            where household_id = shopping_lists.household_id and user_id = auth.uid()
        )
    );

create policy "Members can delete shopping lists" on pantry.shopping_lists
    for delete using (
        exists (
            select 1 from pantry.household_members
            where household_id = shopping_lists.household_id and user_id = auth.uid()
        )
    );

-- Shopping list items
create policy "Members can view shopping list items" on pantry.shopping_list_items
    for select using (
        exists (
            select 1 from pantry.shopping_lists sl
            join pantry.household_members hm on hm.household_id = sl.household_id
            where sl.id = shopping_list_items.shopping_list_id and hm.user_id = auth.uid()
        )
    );

create policy "Members can insert shopping list items" on pantry.shopping_list_items
    for insert with check (
        exists (
            select 1 from pantry.shopping_lists sl
            join pantry.household_members hm on hm.household_id = sl.household_id
            where sl.id = shopping_list_items.shopping_list_id and hm.user_id = auth.uid()
        )
    );

create policy "Members can update shopping list items" on pantry.shopping_list_items
    for update using (
        exists (
            select 1 from pantry.shopping_lists sl
            join pantry.household_members hm on hm.household_id = sl.household_id
            where sl.id = shopping_list_items.shopping_list_id and hm.user_id = auth.uid()
        )
    );

create policy "Members can delete shopping list items" on pantry.shopping_list_items
    for delete using (
        exists (
            select 1 from pantry.shopping_lists sl
            join pantry.household_members hm on hm.household_id = sl.household_id
            where sl.id = shopping_list_items.shopping_list_id and hm.user_id = auth.uid()
        )
    );

-- Food usage log. Rows can be read and added, never changed or deleted.
create policy "Members can view usage log" on pantry.food_usage_log
    for select using (
        exists (
            select 1 from pantry.household_members
            where household_id = food_usage_log.household_id and user_id = auth.uid()
        )
    );

create policy "Members can insert usage log" on pantry.food_usage_log
    for insert with check (
        exists (
            select 1 from pantry.household_members
            where household_id = food_usage_log.household_id and user_id = auth.uid()
        )
        and user_id = auth.uid()
    );

-- Recipes
create policy "Household members can view recipes"
    on pantry.recipes for select
    using (
        household_id is null -- built-in recipes: every signed-in user can read them
        or household_id in (
            select household_id from pantry.household_members where user_id = auth.uid()
        )
    );

create policy "Household members can insert recipes"
    on pantry.recipes for insert
    with check (
        household_id in (
            select household_id from pantry.household_members where user_id = auth.uid()
        )
    );

create policy "Household members can update recipes"
    on pantry.recipes for update
    using (
        household_id in (
            select household_id from pantry.household_members where user_id = auth.uid()
        )
    );

create policy "Household members can delete recipes"
    on pantry.recipes for delete
    using (
        household_id in (
            select household_id from pantry.household_members where user_id = auth.uid()
        )
    );

-- ============================================================================
-- FRESHNESS SCORE
-- ============================================================================

-- Returns 0 to 100: the share of an item's shelf life that is left today.
create function pantry.calculate_freshness_score(
    purchase_date date,
    expiration_date date
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
    total_days integer;
    days_remaining integer;
    score integer;
begin
    total_days := expiration_date - purchase_date;
    days_remaining := expiration_date - current_date;

    if days_remaining <= 0 then
        return 0;
    end if;

    if total_days <= 0 then
        return 100;
    end if;

    score := (days_remaining::decimal / total_days * 100)::integer;
    return greatest(0, least(100, score));
end;
$$;

-- Recalculates the score of every active item and marks items past their
-- date as expired. Meant for a daily scheduled job. The app does not call it,
-- so only service_role and the owner can run it.
create function pantry.update_all_freshness_scores()
returns void
language plpgsql
set search_path = ''
as $$
begin
    update pantry.food_items
    set
        freshness_score = pantry.calculate_freshness_score(purchase_date, expiration_date),
        updated_at = now()
    where status = 'active';

    -- auto-expire items past expiration date
    update pantry.food_items
    set
        status = 'expired',
        updated_at = now()
    where status = 'active' and expiration_date < current_date;
end;
$$;

-- ============================================================================
-- INVITE CODES
-- ============================================================================

-- Gives the household a new invite code and returns it. Runs as the caller,
-- so the households UPDATE policy applies: only the owner can do this, and
-- the function returns null for anyone else.
create function pantry.regenerate_invite_code(p_household_id uuid)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
    update pantry.households
    set invite_code = pantry_private.generate_invite_code()
    where id = p_household_id
    returning invite_code;
$$;

-- ============================================================================
-- JOINING AND LEAVING A HOUSEHOLD
-- ============================================================================

-- Takes the current user out of their household. If they own it, ownership
-- passes to the member who joined first. If nobody else is left, the
-- household is deleted along with its items, lists and recipes.
-- Only join_household_by_invite() and leave_household() call this.
create function pantry_private.leave_current_household()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := (select auth.uid());
    v_membership pantry.household_members%rowtype;
    v_next pantry.household_members%rowtype;
begin
    select * into v_membership from pantry.household_members where user_id = v_user;
    if not found then
        return;
    end if;

    -- serialize with other members leaving at the same time
    perform 1 from pantry.households where id = v_membership.household_id for update;

    select * into v_next
    from pantry.household_members
    where household_id = v_membership.household_id and user_id <> v_user
    order by joined_at, id
    limit 1;

    if not found then
        delete from pantry.households where id = v_membership.household_id;
        return;
    end if;

    if exists (
        select 1 from pantry.households
        where id = v_membership.household_id and owner_id = v_user
    ) then
        update pantry.households set owner_id = v_next.user_id where id = v_membership.household_id;
        update pantry.household_members set role = 'owner' where id = v_next.id;
    end if;

    delete from pantry.household_members where id = v_membership.id;
end;
$$;

-- Joins the household with this invite code and returns its id. Joining moves
-- the caller out of their current household first. Case, spaces and dashes in
-- the code are ignored.
create function pantry.join_household_by_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := (select auth.uid());
    v_household_id uuid;
begin
    if v_user is null then
        raise exception 'Not authenticated';
    end if;

    select id into v_household_id
    from pantry.households
    where invite_code = upper(regexp_replace(p_invite_code, '[^A-Za-z0-9]', '', 'g'));

    if v_household_id is null then
        raise exception 'Invalid invite code';
    end if;

    if exists (
        select 1 from pantry.household_members
        where household_id = v_household_id and user_id = v_user
    ) then
        raise exception 'Already a member of this household';
    end if;

    perform pantry_private.leave_current_household();

    insert into pantry.household_members (household_id, user_id, role)
    values (v_household_id, v_user, 'member');

    return v_household_id;
end;
$$;

-- Leaves the current household and starts a new personal one. Returns its id.
create function pantry.leave_household()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := (select auth.uid());
    v_household_id uuid;
begin
    if v_user is null then
        raise exception 'Not authenticated';
    end if;

    -- leaving would only delete the household and start an empty one
    select household_id into v_household_id from pantry.household_members where user_id = v_user;
    if found and not exists (
        select 1 from pantry.household_members
        where household_id = v_household_id and user_id <> v_user
    ) then
        raise exception 'You are the only member of this household';
    end if;

    perform pantry_private.leave_current_household();

    insert into pantry.households (name, owner_id)
    values ('My household', v_user)
    returning id into v_household_id;

    insert into pantry.household_members (household_id, user_id, role)
    values (v_household_id, v_user, 'owner');

    insert into pantry.shopping_lists (household_id, name, is_default)
    values (v_household_id, 'Shopping list', true);

    return v_household_id;
end;
$$;

-- ============================================================================
-- OWNERSHIP AND ROLES
-- ============================================================================

-- Makes another member the owner. The old owner becomes an admin.
create function pantry.transfer_household_ownership(p_member_id uuid)
returns pantry.household_members
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := (select auth.uid());
    v_member pantry.household_members%rowtype;
begin
    if v_user is null then
        raise exception 'Not authenticated';
    end if;

    select hm.* into v_member
    from pantry.household_members hm
    join pantry.households h on h.id = hm.household_id
    where hm.id = p_member_id and h.owner_id = v_user
    for update of h;

    if not found then
        raise exception 'Only the household owner can transfer ownership';
    end if;

    if v_member.user_id = v_user then
        raise exception 'You already own this household';
    end if;

    update pantry.households set owner_id = v_member.user_id where id = v_member.household_id;

    update pantry.household_members set role = 'admin'
    where household_id = v_member.household_id and user_id = v_user;

    update pantry.household_members set role = 'owner'
    where id = p_member_id
    returning * into v_member;

    return v_member;
end;
$$;

-- Makes another member an admin or a plain member
create function pantry.set_household_member_role(p_member_id uuid, p_role text)
returns pantry.household_members
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := (select auth.uid());
    v_member pantry.household_members%rowtype;
begin
    if v_user is null then
        raise exception 'Not authenticated';
    end if;

    if p_role is null or p_role not in ('admin', 'member') then
        raise exception 'Role must be admin or member. Use transfer_household_ownership() to change the owner.';
    end if;

    select hm.* into v_member
    from pantry.household_members hm
    join pantry.households h on h.id = hm.household_id
    where hm.id = p_member_id and h.owner_id = v_user;

    if not found then
        raise exception 'Only the household owner can change roles';
    end if;

    if v_member.user_id = v_user then
        raise exception 'Transfer ownership before changing your own role';
    end if;

    update pantry.household_members set role = p_role
    where id = p_member_id
    returning * into v_member;

    return v_member;
end;
$$;

-- ============================================================================
-- FIRST-TIME SETUP FOR A SIGNED-IN USER
-- ============================================================================

-- Makes sure the caller has a profile and a household, and returns the
-- household id. The app calls this after sign-in. It replaces the sign-up
-- trigger a single-app project would use.
--
-- It is safe to call on every app start:
--   * If the caller already has a profile and a household, it only reads two
--     rows and returns.
--   * If the profile is missing, it adds it.
--   * If the caller is in no household, it creates one, adds the caller as
--     its owner, and creates the default shopping list.
--
-- It never moves the caller out of a household, never changes a role, and
-- never adds a second membership. A person can be in no household after an
-- owner removes them, after they delete their own membership row, or after
-- the owner deletes the household. The next call gives them a new one.
--
-- The name comes from the sign-in token: user_metadata.display_name, then the
-- part of the email before the @, then 'My'.
create function pantry.ensure_user_setup()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := (select auth.uid());
    v_claims jsonb;
    v_name text;
    v_household_id uuid;
begin
    if v_user is null then
        raise exception 'Not authenticated';
    end if;

    -- The usual case: everything exists already. Return without writing or
    -- locking anything.
    select household_id into v_household_id
    from pantry.household_members
    where user_id = v_user;

    if found and exists (select 1 from pantry.user_profiles where id = v_user) then
        return v_household_id;
    end if;

    -- Two calls for the same user at the same time (two tabs, a double
    -- render) must not create two households. The second call waits here
    -- until the first one commits, then finds the household below. The lock
    -- is released when the transaction ends.
    perform pg_advisory_xact_lock(hashtextextended('pantry.ensure_user_setup:' || v_user::text, 0));

    v_claims := auth.jwt();
    v_name := coalesce(
        nullif(btrim(v_claims -> 'user_metadata' ->> 'display_name'), ''),
        nullif(btrim(split_part(v_claims ->> 'email', '@', 1)), ''),
        'My'
    );

    insert into pantry.user_profiles (id, display_name)
    values (v_user, v_name)
    on conflict (id) do nothing;

    select household_id into v_household_id
    from pantry.household_members
    where user_id = v_user;

    if found then
        return v_household_id;
    end if;

    -- Name the household after the stored profile, which the person may have
    -- edited since they first signed in.
    select display_name into v_name from pantry.user_profiles where id = v_user;

    begin
        insert into pantry.households (name, owner_id)
        values (
            case when v_name = 'My' then 'My household' else v_name || '''s Household' end,
            v_user
        )
        returning id into v_household_id;

        insert into pantry.household_members (household_id, user_id, role)
        values (v_household_id, v_user, 'owner');

        insert into pantry.shopping_lists (household_id, name, is_default)
        values (v_household_id, 'Grocery List', true);
    exception when unique_violation then
        -- The caller joined a household in another transaction while this
        -- one was running, so the one-household-per-user index refused the
        -- membership row. The three inserts above are undone. Return the
        -- household the caller is in now.
        select household_id into v_household_id
        from pantry.household_members
        where user_id = v_user;

        if not found then
            -- Some other unique constraint failed. Report it.
            raise;
        end if;
    end;

    return v_household_id;
end;
$$;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Sets updated_at to the current time on every update
create function pantry.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger update_user_profiles_updated_at
    before update on pantry.user_profiles
    for each row execute function pantry.update_updated_at_column();

create trigger update_households_updated_at
    before update on pantry.households
    for each row execute function pantry.update_updated_at_column();

create trigger update_food_items_updated_at
    before update on pantry.food_items
    for each row execute function pantry.update_updated_at_column();

create trigger update_shopping_lists_updated_at
    before update on pantry.shopping_lists
    for each row execute function pantry.update_updated_at_column();

create trigger update_shopping_list_items_updated_at
    before update on pantry.shopping_list_items
    for each row execute function pantry.update_updated_at_column();

create trigger update_recipes_updated_at
    before update on pantry.recipes
    for each row execute function pantry.update_updated_at_column();

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Supabase grants API access automatically only in the public schema. Here
-- every grant is written out, and each role gets only what it needs.
-- `anon` (not signed in) gets nothing: every screen of the app needs sign-in.

-- Start from nothing, so the result does not depend on the project's default
-- privileges. Postgres itself lets everyone execute a new function, and this
-- removes that too.
revoke all on schema pantry from public, anon, authenticated, service_role;
revoke all on schema pantry_private from public, anon, authenticated, service_role;
revoke all on all tables in schema pantry from public, anon, authenticated, service_role;
revoke all on all tables in schema pantry_private from public, anon, authenticated, service_role;
revoke all on all functions in schema pantry from public, anon, authenticated, service_role;
revoke all on all functions in schema pantry_private from public, anon, authenticated, service_role;

-- Schemas. `authenticated` needs pantry_private because policies and column
-- defaults run as the querying role and call functions in it. Usage alone
-- allows nothing: each function below is granted separately, and the schema
-- is not exposed through the API.
grant usage on schema pantry to authenticated, service_role;
grant usage on schema pantry_private to authenticated, service_role;

-- Tables. A signed-in user gets a command on a table only when the table has
-- a policy for that command. Without a policy the command could never match a
-- row anyway.
grant select, insert, update on pantry.user_profiles to authenticated;
grant select, insert, update, delete on pantry.households to authenticated;
grant select, insert, delete on pantry.household_members to authenticated;
grant select, insert, update, delete on pantry.food_items to authenticated;
grant select, insert, update, delete on pantry.shopping_lists to authenticated;
grant select, insert, update, delete on pantry.shopping_list_items to authenticated;
grant select, insert on pantry.food_usage_log to authenticated;
grant select, insert, update, delete on pantry.recipes to authenticated;

-- service_role is used by server-side code and bypasses row-level security.
grant all on pantry.user_profiles to service_role;
grant all on pantry.households to service_role;
grant all on pantry.household_members to service_role;
grant all on pantry.food_items to service_role;
grant all on pantry.shopping_lists to service_role;
grant all on pantry.shopping_list_items to service_role;
grant all on pantry.food_usage_log to service_role;
grant all on pantry.recipes to service_role;
grant all on pantry_private.schema_migrations to service_role;

-- Functions the app calls over the API
grant execute on function pantry.ensure_user_setup() to authenticated;
grant execute on function pantry.join_household_by_invite(text) to authenticated;
grant execute on function pantry.leave_household() to authenticated;
grant execute on function pantry.regenerate_invite_code(uuid) to authenticated;
grant execute on function pantry.set_household_member_role(uuid, text) to authenticated;
grant execute on function pantry.transfer_household_ownership(uuid) to authenticated;

-- Functions the policies call. A policy runs as the querying role.
grant execute on function pantry_private.is_household_member(uuid) to authenticated;
grant execute on function pantry_private.is_household_admin(uuid) to authenticated;
grant execute on function pantry_private.owns_household(uuid) to authenticated;

-- The invite_code column default runs as whoever inserts the household
grant execute on function pantry_private.generate_invite_code() to authenticated, service_role;

-- The daily freshness job. Not granted to authenticated.
grant execute on function pantry.calculate_freshness_score(date, date) to service_role;
grant execute on function pantry.update_all_freshness_scores() to service_role;

-- Not granted to anyone:
--   pantry_private.leave_current_household()  called only by the functions above
--   pantry.update_updated_at_column()         a trigger function; triggers need no grant

-- ============================================================================
-- REALTIME
-- ============================================================================

-- The app subscribes to changes on these four tables. A table sends changes
-- only if it is in the supabase_realtime publication. This block skips a
-- table that is already in it, and warns instead of failing if the
-- publication does not exist or already covers every table.
do $$
declare
    v_all_tables boolean;
    v_table text;
begin
    select puballtables into v_all_tables
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime';

    if not found then
        raise warning 'Publication supabase_realtime does not exist. Realtime is not set up for the pantry tables.';
        return;
    end if;

    if v_all_tables then
        raise notice 'Publication supabase_realtime already covers all tables. Nothing to add.';
        return;
    end if;

    foreach v_table in array array['food_items', 'shopping_list_items', 'household_members', 'recipes'] loop
        if not exists (
            select 1 from pg_catalog.pg_publication_tables
            where pubname = 'supabase_realtime'
            and schemaname = 'pantry'
            and tablename = v_table
        ) then
            execute format('alter publication supabase_realtime add table pantry.%I', v_table);
        end if;
    end loop;
end $$;

-- ============================================================================
-- CHECKS BEFORE COMMIT
-- ============================================================================

-- Fails, and undoes everything above, if the result is less locked down than
-- intended. This catches project settings this file does not know about, such
-- as default privileges that grant to anon.
do $$
declare
    v_problem text;
begin
    -- anon must have no access at all
    if has_schema_privilege('anon', 'pantry', 'usage')
        or has_schema_privilege('anon', 'pantry_private', 'usage')
    then
        raise exception 'anon has usage on a pantry schema';
    end if;

    select string_agg(c.oid::regclass::text, ', ') into v_problem
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('pantry', 'pantry_private')
    and c.relkind = 'r'
    and has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger');
    if v_problem is not null then
        raise exception 'anon has privileges on: %', v_problem;
    end if;

    select string_agg(p.oid::regprocedure::text, ', ') into v_problem
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('pantry', 'pantry_private')
    and has_function_privilege('anon', p.oid, 'execute');
    if v_problem is not null then
        raise exception 'anon can execute: %', v_problem;
    end if;

    -- every table must have row-level security on
    select string_agg(c.oid::regclass::text, ', ') into v_problem
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('pantry', 'pantry_private')
    and c.relkind = 'r'
    and not c.relrowsecurity;
    if v_problem is not null then
        raise exception 'Row-level security is off on: %', v_problem;
    end if;

    -- every function must have a fixed, empty search_path
    select string_agg(p.oid::regprocedure::text, ', ') into v_problem
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('pantry', 'pantry_private')
    and not coalesce(p.proconfig @> array['search_path=""'], false);
    if v_problem is not null then
        raise exception 'search_path is not pinned on: %', v_problem;
    end if;
end $$;

-- ============================================================================
-- RECORD THIS FILE
-- ============================================================================

-- A plain insert on purpose. If this version is already recorded, the insert
-- fails and the whole file is rolled back.
insert into pantry_private.schema_migrations (version) values ('20261121000100');

commit;
