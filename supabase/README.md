# Supabase setup for the pantry app

The pantry app does not have its own Supabase project. It uses the same hosted
project as DoDone. This file explains the rules that follow from that, the
one-time setup, and how to change the database later.

## How the project is divided

| Part | Who uses it |
|---|---|
| `auth` (users, sessions) | Shared. One account works in every app. |
| `public` schema | DoDone only. The pantry app never creates or changes anything here. |
| `pantry` schema | Pantry tables, and the functions the app calls. |
| `pantry_private` schema | Pantry helper functions and the list of applied migrations. Not reachable through the API. |
| Edge functions | Shared list. Pantry functions are named `pantry-*`. |
| Storage buckets, cron jobs, secrets | Shared lists. Prefix new ones with `pantry-` or `PANTRY_`. |

## Rules

1. **Never run `supabase db push` from this repo.** It records versions in a
   project-wide table that DoDone's own `db push` reads. DoDone's push fails
   when it finds versions it does not have. Use `scripts/db-apply.sh`.
2. **Never create or change anything in `public`.** `scripts/db-apply.sh`
   refuses a file that names a `public.` object.
3. **No triggers on `auth.users`.** A trigger there runs for every app's
   sign-ups, and if it fails, sign-up fails for every app. The app calls
   `pantry.ensure_user_setup()` after sign-in instead. That function creates
   the person's profile, household and default shopping list if they are
   missing.
4. **"Signed in" does not mean "pantry user".** Anyone with an account from
   any app in this project can call the pantry API. Every table needs
   row-level security that checks household membership.
5. **Every new table needs explicit grants.** Supabase only grants API access
   automatically in `public`. Grant to `authenticated` and `service_role`, and
   only the commands the table has policies for.
6. **A table the app subscribes to must be added to the `supabase_realtime`
   publication**, and the subscription must name the `pantry` schema. If
   either is wrong, the subscription never fires and no error is raised.
7. **Sign-out uses `scope: 'local'`.** The default ends the person's sessions
   in every app.
8. **Deleting a pantry account must delete pantry data only.** Deleting the
   row in `auth.users` also deletes that person's DoDone data. See "Known
   gaps" for what happens today.

## One-time setup on the shared project

Do these in order. Steps 3 to 5 are in the Supabase dashboard.

1. Link this repo to the shared project:

   ```bash
   supabase link --project-ref <ref of the DoDone project>
   ```

2. Create the pantry schemas:

   ```bash
   scripts/db-apply.sh apply supabase/migrations/20261121000100_pantry_schema.sql
   ```

   The Supabase CLI asks for confirmation before it changes the hosted
   database. The file runs in one transaction. If any statement fails,
   nothing is changed.

3. **Expose the schema.** Project Settings → API → Exposed schemas: add
   `pantry`. Leave `public` first in the list. Do not add `pantry_private`.
   Until this is done every request from the app fails with `PGRST106`.

4. **Allow the app's URLs.** Authentication → URL Configuration → Redirect
   URLs: add the pantry app's production URL and `http://localhost:5173/**`.
   Leave the Site URL as it is. It belongs to DoDone.

   An entry `https://example.com/**` matches `https://example.com/` but not
   `https://example.com` with no trailing slash. A redirect that does not
   match is silently replaced by the Site URL, so the person lands on
   DoDone. The app always sends a path that starts with `/`.

5. **Email templates.** There is one set of templates for the whole project,
   and it currently says "Welcome to DoDone". The pantry app sends
   `app: 'pantry'` in the sign-up data, so the confirmation template can pick
   its wording:

   ```
   {{ if eq .Data.app "pantry" }}
     <h2>Welcome to Pantry</h2>
   {{ else }}
     <h2>Welcome to DoDone</h2>
   {{ end }}
   ```

   Compare with `printf "%v"` as in the live template, not with a plain
   `eq .Data.app "pantry"`. Sign-up data is whatever the client sends. A plain
   `eq` fails when `app` is a number, and a template that fails makes that
   sign-up fail with HTTP 500.

   `.Data.app` is set once, by the app the person signed up in. The password
   reset email still uses Supabase's default wording, which names neither
   app.

6. Deploy the edge functions and set their secret:

   ```bash
   supabase functions deploy pantry-barcode-lookup pantry-import-recipe pantry-process-image pantry-process-receipt pantry-suggest-recipes
   ```

   ```bash
   supabase secrets set OPENAI_API_KEY=<key>
   ```

   Secrets are visible to every function in the project.

7. Set the app's environment variables to the shared project's values:
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. They are the same URL and
   anon key DoDone uses.

## Changing the database later

1. Add a file to `supabase/migrations/` named `<14-digit timestamp>_<what>.sql`.
2. Start it with `begin;` followed by a plain insert of its version into
   `pantry_private.schema_migrations`. End it with `commit;`. The insert makes
   a second run fail before it changes anything.
3. Qualify every name with `pantry.` or `pantry_private.`.
4. Apply it:

   ```bash
   scripts/db-apply.sh apply supabase/migrations/<file>.sql
   ```

To see which files the hosted project has:

```bash
scripts/db-apply.sh status
```

## Local development

`supabase start` works as usual. It applies the files in `supabase/migrations/`
to a local database, and `supabase/config.toml` already exposes the `pantry`
schema locally.

## Known gaps

- **`pantry-barcode-lookup` accepts the public anon key.** It only calls the
  free Open Food Facts API, so it has no sign-in check. The four AI functions
  do have one: they call `requireUser()` from
  `supabase/functions/_shared/requireUser.ts`, which refuses the anon key and
  anonymous users. A new function that costs money must call it too.
- **An account that owns a pantry household cannot be deleted.** Several
  pantry columns point at the person (`households.owner_id`,
  `food_items.added_by` and others) with no delete rule, so deleting the row in
  `auth.users` fails with a foreign-key error. This applies to deletion from
  DoDone and from the dashboard too. It fails without losing data. There is no
  "delete my pantry data" function yet. Until there is, remove the person's
  pantry rows by hand first.
- **Member names can come back empty.** The app reads other household members'
  profiles, but the policy on `user_profiles` only lets a person read their
  own row.
- **Most pages do not use the database yet.** Inventory, recipes, shopping and
  the plan pages read data saved in the browser, even for a signed-in user.
  Only the Household page and the AI features call Supabase.

## Still to do in DoDone

These are outside this repo:

- Change DoDone's sign-out to `signOut({ scope: 'local' })`, so signing out of
  DoDone does not sign the person out of the pantry app.
- Update the email templates as described in step 5.
- New tables in `public` no longer get API grants automatically (a Supabase
  change applied to existing projects on 2026-10-30). New DoDone tables need
  explicit `grant` statements.
