-- Food roles, servings, last-touched time and household size
--
-- What this file changes
--   pantry.food_items gets four columns, all nullable with no default:
--     role         what the food does in a meal (main, base, produce,
--                  breakfast, snack, flavor, drink)
--     role_source  'guessed' when the app chose the role, 'manual' when a
--                  person did. The app never replaces a manual role with a guess.
--     servings     servings left, when a person typed it. Null means the app
--                  estimates it from quantity, unit and role.
--     touched_at   when a person last used, counted, adjusted or edited the
--                  item. Null on older rows; the app falls back to purchase_date.
--   pantry.households gets one column:
--     size         people eating at home. Null means the app's default (2).
--
-- What this file does not change
--   No existing column, index, policy or function. Existing rows keep null in
--   the new columns, and the app fills in a guess when it reads them. The
--   existing row-level security policies cover the new columns.
--
-- Locks
--   Adding a nullable column with no default only changes the catalog. The
--   check constraints read each table once to validate it, and these tables
--   are small. Each statement takes a short exclusive lock on its table. If a
--   lock cannot be taken within 5 seconds the file fails and nothing changes.
--
-- How to run it
--   Once, by hand: scripts/db-apply.sh apply supabase/migrations/20261128000100_food_roles_servings_touched.sql
--   A second run fails at the insert below and changes nothing.

begin;

set local lock_timeout = '5s';

-- A plain insert on purpose. If this version is already recorded, the insert
-- fails and the whole file is rolled back.
insert into pantry_private.schema_migrations (version) values ('20261128000100');

alter table pantry.food_items
    add column role text,
    add column role_source text,
    add column servings numeric,
    add column touched_at timestamptz,
    add constraint food_items_role_check
        check (role in ('main', 'base', 'produce', 'breakfast', 'snack', 'flavor', 'drink')),
    add constraint food_items_role_source_check
        check (role_source in ('guessed', 'manual')),
    add constraint food_items_servings_check
        check (servings >= 0);

comment on column pantry.food_items.role is 'What the food does in a meal. Null on rows from before roles; the app guesses then.';
comment on column pantry.food_items.role_source is 'guessed: the app chose the role. manual: a person chose it, and no guess replaces it.';
comment on column pantry.food_items.servings is 'Servings left, typed by a person. Null: the app estimates from quantity, unit and role.';
comment on column pantry.food_items.touched_at is 'When a person last used, counted, adjusted or edited the item. Null: use purchase_date.';

alter table pantry.households
    add column size integer,
    add constraint households_size_check
        check (size between 1 and 20);

comment on column pantry.households.size is 'People eating at home. Null: the app uses 2.';

commit;
