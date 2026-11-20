# Handoff: add the allergy checker to pantry-app

Written 2026-11-11 by the Claude Code session that built food-allergy-app. Every fact about
pantry-app below was checked on that date, and the checks are named so you can rerun them.

This copy lives in pantry-app and is kept up to date as decisions change. The original is
`/Users/brian/Projects/food-allergy-app/HANDOFF-PANTRY-APP.md`.

## Brian's answers (2026-11-13)

1. **Order of the work: demo-first.** The allergy features are built on a local demo store behind a
   data module that will get a Supabase version in step 3.
2. **Supabase project: decide at step 3.** Nothing before step 3 needs one. Ask again before step 3.
3. **The Expo phone app: retire it.** So:
   - pantry-app owns the verdict engine, the dictionary and the food-data package from now on.
     Engine changes no longer need to be copied back to food-allergy-app.
   - In step 3, don't bring `push_tokens` or the Expo push code into pantry's schema and Edge
     Functions. Web push stays a step 4 item.

The defaults in the "Defaults to state" table below were stated to Brian and stand, except where Check
goes (see the status below). On 2026-11-19 Brian chose again to pick the Supabase project later.

## Status (2026-11-19, branch `allergy-on-main`)

**Steps 0, 1 and 2 are done, on top of GitHub's `main` (`5cfe9cf`).** Nothing is pushed. No Supabase
project exists.

**Why this branch, and not `allergy-integration`.** The handoff (2026-11-11) checked a local `main` at
`c49abb8`. GitHub's `main` was already 34 commits ahead (PRs #2 to #8, 2026-10-18 to 10-21), and nobody
fetched it. The first build, on branches `allergy-integration` and `pantry-small-fixes`, conflicted with
`main` in 19 files. This branch replays that work on `main` and replaces both. Don't merge either of them.

GitHub's `main` had already done several things this plan asks for:

- Step 0's 19 story type errors (PR #2). Lint has no errors.
- Problems 1 to 3 below: the RLS recursion, the self-insert hole and `search_path` (migrations 003 to
  005). So the allergy migrations in step 3 start at 006.
- Dates read and written as local calendar days, and the freshness bar worked out from the dates.
- A new design: a charcoal `primary` color token, sentence case, a + button that opens an Add sheet, a
  side nav from tablet width up, and the same header on every tab.

**What the allergy work looks like on `main`:**

- The allergy screens use `main`'s `PageHeader`, page widths and `primary` color.
- **Where Check goes (changed from the default below).** The phone bottom nav already has four tabs and
  the +, so a fifth tab would push the + off center and undo PR #3's simpler nav. Check is in the side
  nav on tablet and desktop, and on phones it is a shield button beside the settings gear in each tab's
  header. Ask Brian whether he wants a phone tab instead.
- The page header and the navs hide when printing, so the chef card prints on its own.

| Check | Result |
| --- | --- |
| `npm run build` | Passes. Main bundle 832 KB (241 KB gzipped); `main` alone is 821 KB (237 KB). The engine, dictionary, polyfill and `.wasm` are separate chunks that load on demand. |
| `npm test` | 186 pass: engine 156, food-data 21, web allergy helpers 9. |
| `npm run lint` | 0 errors and 4 warnings, all 4 already on `main`. ESLint now ignores `.claude/`, where other sessions' worktrees live. |
| `npm run check:shared` | Up to date. |
| Storybook | All 144 stories render with no errors, the 16 allergy stories included. |
| The five milestone-1 checks | All passed in the dev server at 375 px phone width, and the Check page at desktop width, against live Open Food Facts. Nutter Butter (`044000037451`) gave "Contains peanuts (peanut butter, peanuts)"; Nutella (`009800895250`) gave "Contains milk (milk, whey)". |

Not checked on this branch: a real camera scan, Safari and Firefox themselves, and printing on paper.
The barcode polyfill, store barcodes and wrong check digits were checked on the first build and the
code is unchanged.

**The engine is unchanged.** food-data gained one option (`userAgentHeader`) with tests.

**Next:** step 3. Ask Brian which Supabase project to use first. Decisions so far are in
`docs/allergy/DECISIONS.md` under "pantry-app integration".

## How to use this file

**Brian:** open a local Claude Code session in `/Users/brian/Projects/pantry-app` and paste:

> Read /Users/brian/Projects/food-allergy-app/HANDOFF-PANTRY-APP.md and follow it.

It must be a local session. food-allergy-app has no git remote, so a cloud session cannot see it.

**The session reading this:**

1. Read this whole file before changing anything.
2. Read these too: food-allergy-app's `README.md`, `DECISIONS.md` and `OPEN_QUESTIONS.md`.
3. Ask Brian the three questions under "Ask Brian first", in one message. Then go ahead with the
   defaults for everything else.
4. In your first commit, copy this file into pantry-app as `docs/ALLERGY_INTEGRATION.md`. Keep that
   copy updated as decisions change.
5. Don't change anything in food-allergy-app. It is the source you copy from.

## The goal

pantry-app becomes the one app for the family's food. It gains the allergy checker from
food-allergy-app:

- allergy profiles for each person in the household;
- a verdict per person for any product, by barcode or by label photo;
- allergy badges on pantry items;
- chef cards for restaurants;
- recall and ingredient-change alerts, including for items already in the pantry.

**What carries over unchanged:** the verdict engine, the allergen dictionary, the food-data parsers
and the Supabase backend. **What is rebuilt:** the screens, in pantry's web stack. The Expo screens
are React Native, so use them only as a reference for behavior.

**Milestone 1 (no server, demo mode).** Brian can do all of this in a browser:

1. Add people and their allergies under Settings, then Allergies.
2. Scan or type a barcode on a new Check page, and see a verdict per person with the words that
   caused it.
3. Add that product to the pantry from the Check page. The pantry list then shows an allergy badge
   for it.
4. Open the item and see the full result.
5. Open a printable English chef card.

Also for milestone 1: all engine and food-data tests pass inside pantry-app, and `npm run build`
passes.

**Milestone 2 (with Supabase):**

- profiles are shared across the household's devices;
- Claude reads label photos;
- chef cards are translated;
- recall and ingredient-change alerts cover the products in the pantry.

## What exists today

### food-allergy-app (the source)

`/Users/brian/Projects/food-allergy-app` is a pnpm workspace. It has 3 local commits on `main`
(latest `d76e54f`) and no git remote.

| Folder | What it is | What to do with it |
| --- | --- | --- |
| `packages/verdict-engine` | The engine. Plain TypeScript with no network and no AI. Includes `data/dictionary.json`: 16 allergens and 435 term rows, 48 of which Claude added and nobody has reviewed yet. | Copy as is |
| `packages/food-data` | Parsers and fetchers for USDA, Open Food Facts, openFDA and FSIS, plus the chef-card text | Copy as is |
| `fixtures/` | 65 real US labels with hand-checked answers, recorded API responses and 10 label photos (764 KB) | Copy as is; the tests need it |
| `scripts/sync-shared.mjs`, `scripts/gen-dictionary-sql.mjs` | Copies the packages into `supabase/functions/_shared/`; turns `dictionary.json` into a SQL seed | Copy, then fix paths and names |
| `supabase/migrations/` | Schema, row-level security (RLS), dictionary seed, storage bucket and cron jobs, discovery query | Merge into pantry's schema (see "Schema merge") |
| `supabase/functions/` | 7 Edge Functions plus `_shared/` | Copy, then rename tables |
| `supabase/tests/` | RLS tests in PGlite (Postgres compiled to WebAssembly, no Docker), with `supabase-stub.sql` standing in for Supabase's `auth` schema | Copy the method; rewrite the tests for the merged schema |
| `apps/mobile/` | The Expo app (SDK 58, React Native) | Reference only |
| `modules/label-ocr/` | Native OCR (Apple Vision, ML Kit) | Not usable on the web |

**Tests.** 188 Node tests pass:

- verdict-engine: 156 (fixtures 67, parse-and-match 53, rules 32, invariants 4);
- food-data: 19;
- RLS: 13.

There are also 6 Deno tests for the Edge Function shared code. Run them all with `pnpm check`.

**Nothing has been deployed.** No Supabase project exists for this backend. The Edge Functions have
never run on real Supabase, and no live Claude call has been made. The Expo app was tested in the iOS
Simulator in local mode only.

The original plan is the Claude Doc "Food Allergy App: Claude Code Build Plan"
(https://claude.ai/artifact/DmGaZyAP4mbiUC1jkErK7h). Read it with the Artifact tool's `read` action
if you need more detail than DECISIONS.md gives.

### pantry-app (the target)

> **Out of date.** This section describes the local checkout at `c49abb8`, which was a month behind
> GitHub. See "Status" at the top for what GitHub's `main` already fixed.

`/Users/brian/Projects/pantry-app`: GitHub `byebrianwong/pantry-app`, `main` at `c49abb8`, with
`.claude/` untracked.

**Stack:**

- Vite 6, React 18 and React Router 7.
- Styling is Tailwind 3 with Material 3 color tokens.
- Icons come from lucide-react and `@mui/icons-material`. `@mui/material` is installed, but `src`
  imports only the icons.
- State and data: zustand, React Query, react-hook-form with zod, and supabase-js.
- The package manager is npm (`package-lock.json`).
- Storybook 10 with the a11y and Chromatic addons. There is no `chromatic.config.json`, so no
  Chromatic project is connected.

**Spec:** `PANTRY_SPECIFICATION.md` (105 KB).

**Data.**

- Every page reads and writes `src/stores/demoStore.ts`: a zustand store saved to localStorage.
- `src/services/*Api.ts` has Supabase versions of the same operations, but pages don't use them. The
  only exceptions are the household page, the AI calls, recipe import and the barcode scanner.
- `isDemoMode` is true when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing. There is no
  `.env`, so the app always runs in demo mode.
- In demo mode `lookupBarcode()` returns an error, so adding by barcode doesn't work in demo mode
  today.

**Supabase.**

- Two migrations: `001_initial_schema.sql` and `002_recipes.sql`. No project is linked.
- Edge Functions:
  - `barcode-lookup` returns name, brand and category from Open Food Facts.
  - `process-image`, `process-receipt`, `import-recipe` and `suggest-recipes` call OpenAI `gpt-4o`
    with `OPENAI_API_KEY`.

**Build state:**

- `npm run build` fails at `tsc -b` with 19 type errors, all in `src/stories/`.
- `vite build` on its own succeeds and makes one 785 KB JavaScript file (219 KB gzipped).
- `npm run lint` reports 25 errors and 12 warnings.
- There is no vitest config and there are no unit tests.

**Running it:** `.claude/launch.json` has a `pantry-app` entry that runs `npm run dev` on port 5173.

### Problems found in pantry-app while preparing this

1. **Every household query fails once Supabase is on (verified).**
   - The `household_members` select policy reads `household_members`, so Postgres stops with
     `infinite recursion detected in policy for relation "household_members"`.
   - Every other table's policy reads `household_members` too, so they fail the same way.
   - I loaded `001_initial_schema.sql` into PGlite with food-allergy-app's `supabase-stub.sql`,
     signed up a user, and queried as that user. `household_members`, `households` and `food_items`
     all failed with that error. The script is under "Reproducing the RLS recursion" below.
   - The fix is food-allergy-app's `is_household_member()` function (a `security definer` function,
     so the policy check doesn't call itself). Then rewrite every pantry policy to use it.
2. **A future hole in the member insert policy (read from the policy, not tested).**
   - The insert policy allows `OR user_id = auth.uid()` for any household and any role.
   - Today the recursion error stops every insert first. Once the recursion is fixed, that clause
     would let any signed-in user who knows a household's id add themselves as `owner`.
   - Drop the clause. Joining should go only through `join_household_by_invite()`, and the signup
     trigger is `security definer`, so neither needs it.
3. **Security definer functions without a fixed `search_path`.**
   - `handle_new_user`, `join_household_by_invite` and `get_user_household_id` don't set
     `search_path`.
   - Supabase's security advisor flags this. Add `set search_path = ''` and write table names with
     their schema.
4. **The barcode scanner only works in some browsers.**
   - `BarcodeScanner.tsx` uses only the browser's `BarcodeDetector` API.
   - As far as I know, Safari and Firefox don't ship it switched on, so iPhone users can only type
     the number. Check caniuse.com before relying on this.

## Safety rules (do not break these)

These come from the build plan and DECISIONS.md. They must hold in pantry-app exactly as they did
in food-allergy-app.

1. **Only the verdict engine decides verdicts.**
   - Claude only transcribes label photos and translates chef cards.
   - Don't add any AI call that produces or adjusts a verdict. That includes pantry's OpenAI
     functions: `process-image` or `suggest-recipes` must never say whether a food is safe.
2. **No ingredient list means "unknown", never green.**
   - Never pass a product name, pantry item name, receipt line or recipe ingredient name to
     `evaluate()` as if it were a label's ingredient list.
   - The engine guards against missing text, but it can't tell that a name isn't a label.
3. **Every verdict shows its evidence:**
   - the words that caused it;
   - the source (USDA, Open Food Facts or "your label photo") and the date;
   - the notice "Always check the label on the package too. Recipes change, and databases can be
     wrong."
4. **Verdicts use an icon and words, never color alone.**
   - pantry already uses green, yellow, orange and red for freshness (`src/utils/freshness.ts` and
     the `freshness` colors in `tailwind.config.js`).
   - An allergy badge must not look like a freshness badge. Give it its own icon (for example a
     shield) and words such as "Contains milk", "Check" or "OK for Sam".
5. **The overall verdict order is red, then unknown, then yellow, then green.**
6. **The dictionary has one home: `packages/verdict-engine/data/dictionary.json`.**
   - Every term needs a source URL.
   - Terms Claude added count only as "possible" until a person reviews them.
   - `validateDictionary()` rejects a term with no source. `isActive()` keeps unreviewed Claude
     terms at "possible", and guards Claude added don't hide anything.
   - After an edit, regenerate the SQL seed and the Edge Function copy.
7. **Store barcodes say "Store-made item: ask staff".** These are barcodes starting 02, 04 or 20–29.
   The engine already does this; don't override it in the UI.
8. **Don't re-implement engine rules in the UI.** That covers refined oils, FALCPA vague terms, the
   FDA tree nut list, coconut, shellfish versus molluscs and gluten. The UI only displays what
   `evaluate()` returns.
9. **The browser gets only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.**
   `ANTHROPIC_API_KEY`, `USDA_API_KEY`, `CRON_SECRET`, `OPENFDA_API_KEY` and `OPENAI_API_KEY` live
   only in Edge Function secrets.
10. **Only Edge Functions write `products` rows**, using the service role. Clients only read them.
11. **Change the engine only with a test that shows the change.** All fixture and invariant tests
    must still pass afterwards. The invariants include "adding a dictionary term never turns red
    into green".

## Ask Brian first

Ask these three questions in one message. Each has a recommended default.

1. **The order of the work.**
   - pantry runs entirely on the local demo store today.
   - **Recommended:** build the allergy features demo-first, behind a small allergy data module with
     two versions (demo store and Supabase). That matches how pantry is built. Connect Supabase in
     step 3.
   - **Alternative:** fix and connect Supabase for all of pantry first.
2. **A Supabase project.**
   - Milestone 2 needs one, and pantry has none linked.
   - Creating it, setting secrets and deploying all happen outside this Mac and may cost money:
     Supabase plan limits and Anthropic API usage. The USDA key is free.
   - Each of those steps needs Brian's explicit yes. Ask which project to use or whether to create
     one.
3. **The Expo phone app.**
   - Option A: keep it as a separate app that later points at pantry's backend.
   - Option B: retire it.
   - This decides two things:
     - whether `push_tokens` and the Expo push code stay;
     - which repository owns the engine from now on.
   - **Default:** keep the push code and table (they do nothing without tokens). Treat pantry-app's
     copy of the engine as the main one, and list any engine change in `docs/ALLERGY_INTEGRATION.md`
     so it can be copied back.

Defaults to state, not ask, unless Brian objects:

| Topic | Default |
| --- | --- |
| Sign-in | Keep pantry's email and password. (The allergy app used email codes.) |
| pantry's OpenAI functions | Leave them alone. Both keys are needed. Moving them to Claude would be its own task. |
| Allergy table names | `allergy_profiles`, `allergy_profile_allergens`, `allergy_profile_avoids`. pantry already has `user_profiles`, so a table named `profiles` would confuse people. |
| Where Check goes | A fourth bottom-nav tab, "Check", next to Pantry, Recipes and Shopping. **Changed 2026-11-19:** `main`'s phone nav is full, so Check is in the side nav and a shield button in the phone tab headers. |
| Recipe and shopping list checks | Later (step 4), under the "never green" rule below. |

## The plan

Work on a branch, for example `allergy-integration`. Commit after each logical change. Don't push or
open a pull request unless Brian asks.

### Step 0: baseline

**Already done on GitHub's `main`** (PR #2). Only the first step, copying this file, was left.

1. Copy this file to `docs/ALLERGY_INTEGRATION.md`.
2. Fix the 19 type errors in `src/stories/` so `npm run build` passes, in a commit of its own.
   Without this, the build can't be used to check the rest of the work.
3. Leave the existing lint backlog alone unless Brian asks, but don't add new lint errors.

### Step 1: bring the shared code over

1. Copy these into pantry-app at the same relative paths:
   - `packages/verdict-engine` and `packages/food-data` (src, test, data, `package.json`,
     `tsconfig.json`);
   - `fixtures/`;
   - `tsconfig.base.json`.

   The tests find fixtures at `../../../fixtures` from `packages/*/test`. The packages rely on
   `noUncheckedIndexedAccess` and `verbatimModuleSyntax` from `tsconfig.base.json`, which pantry's
   own tsconfig doesn't set.
2. In pantry's `package.json`, add `"workspaces": ["packages/*"]`.
3. In `packages/food-data/package.json`, change `"@allergy/verdict-engine": "workspace:*"` to `"*"`.
   npm doesn't understand `workspace:`. Then run `npm install`.
4. Add a vitest config:
   - include `packages/*/test/**/*.test.ts` and `supabase/tests/**/*.test.ts`;
   - set `testTimeout: 30_000`;
   - don't disturb Storybook's vitest addon.
5. Watch for version differences:
   - pantry has vitest 4 and TypeScript 5.6; the allergy repo used vitest 5 and TypeScript 6.0.
   - Run the tests and the type checks. Fix only what breaks, and note each fix.
6. Add npm scripts adapted from food-allergy-app's root `package.json` (swap pnpm for npm):
   - `test`;
   - a type check for the packages;
   - `sync:shared` and `check:shared`;
   - `gen:dictionary`;
   - `test:deno`, using the npm `deno` package as a dev dependency.
7. Add `supabase/functions/_shared/verdict-engine` and `_shared/food-data` to ESLint's ignores.
   They are generated copies.

**Done when:** the 156 verdict-engine tests and 19 food-data tests pass in pantry-app.

### Step 2: allergy features in the browser (demo mode)

**Data module** (`src/services/allergyApi.ts` or a `src/allergy/` folder).

- One interface for:
  - profiles (people, allergens with severity and "avoid may contain", custom avoids, color);
  - the product cache by GTIN (the 14-digit barcode number);
  - Safe and Avoid lists;
  - scan history.
- The demo version is a new zustand store saved to localStorage, with its own version number, like
  `demoStore.ts`. The Supabase version comes in step 3.

**Logic to port.** These are pure TypeScript or close to it:

| Source | What to take |
| --- | --- |
| `apps/mobile/src/lib/dictionary.ts` | Expanding the dictionary once, and the allergen names and hints. The dictionary is 34 KB, or 5.7 KB gzipped. |
| `apps/mobile/src/lib/verdict.ts` | `verdictFor`, `productName` and `SOURCE_LABEL` |
| `apps/mobile/src/components/result-view.tsx` | `condenseReasons` (one line per allergen) and the ingredient highlighting. Highlight only the words that matter for the people selected. |
| `apps/mobile/src/lib/products.ts` | How records from several sources are merged and cached. The storage is SQLite there; rewrite that part. |

**Product lookup in demo mode.**

- Call Open Food Facts straight from the browser, using food-data's `fetchOffProduct` and
  `normalizeOffProduct`. Its API allows browser requests: on 2026-11-11 it answered with
  `access-control-allow-origin: *`, and its allowed headers include `User-Agent` and
  `X-User-Agent`.
- Chrome won't send a custom `User-Agent` from a web page. Add an option to `fetchOffProduct` to send
  `X-User-Agent` instead, with an app name and contact address (the mobile app used
  `EXPO_PUBLIC_OFF_CONTACT_EMAIL`).
- Keep under Open Food Facts' limit of 15 product reads a minute (see the comment in
  `fetchers.ts`), and cache results.
- USDA lookups need a key, so they are server-only (step 3).
- This also fixes pantry's own add-by-barcode in demo mode.

**Components.** Use Tailwind, match `src/components/common`, and add Storybook stories like the
existing ones:

- `VerdictBadge`: icon and words.
- `PersonChips`: who you're checking for.
- `AllergyResult`, which shows:
  - the overall verdict;
  - a row for each person, with their reasons;
  - the ingredients with trigger words highlighted;
  - the source and date;
  - notes;
  - the "always check the label" notice.
- `AllergyProfileEditor`.

**Routes:**

| Route | What it does |
| --- | --- |
| `/settings/allergies` and `/settings/allergies/:id` | List and edit people. Add an "Allergies" row to the Settings page next to Household. |
| `/check` | Check a product: scan or type a barcode, see `AllergyResult`. Actions: Add to pantry (opens the add page filled in), Save as Safe or Avoid. |
| `/chef-card` | The English card for the selected people (`buildChefCard`), with a print stylesheet, copy-text, and the Web Share API where the browser has it |

**Pantry integration.**

- **Saving the barcode.** When an item is added by barcode, save its normalized GTIN on the item
  (`normalizeGtin` / `toGtin14`) and cache the product record.
- **The pantry card (`FoodItemCard`).**
  - Show an allergy badge only for items that have product data.
  - Items typed by hand ("Banana") have never been checked, so they show no allergy badge.
  - For items with product data, green is fine: it comes from real ingredient text.
- **The item page (`ItemDetailPage`).**
  - Add an `AllergyResult` section.
  - For items without product data, say "Not checked: no ingredient list. Scan the barcode or
    photograph the label."
- **The add page (`AddItemPage`), after a scan.**
  - Show the verdict before saving.
  - If it is red for anyone, say who and why, and ask for a second tap to add. Don't block it.
- **Optional:** an inventory filter, "Has allergens for…".

**Barcode scanning in Safari.**

- Add a `BarcodeDetector` polyfill, such as the `barcode-detector` npm package, which runs ZXing in
  WebAssembly.
- Check its current version and license first.
- Load it only when `'BarcodeDetector' in window` is false, so Chrome users don't download it.

**Bundle size.** Load the allergy routes with `React.lazy`. The main JavaScript file is already
785 KB.

**Done when:**

- the five milestone-1 checks under "The goal" work in the browser, at phone width and at desktop
  width;
- the new stories render;
- `npm run build` and all tests pass.

### Step 3: backend (ask Brian before anything touches a real Supabase project)

**Migrations.** Continue pantry's numbering.

| Migration | What it does |
| --- | --- |
| ~~`003_fix_household_rls.sql`~~ | **Already done on GitHub's `main`** (2026-10-19, PRs #4 to #7), as `003_tighten_household_members_insert.sql`, `004_household_membership_rules.sql` and `005_harden_security_definer_functions.sql`. They add `private.is_household_member()`, `private.is_household_admin()` and `private.owns_household()`, end the recursion, drop the self-insert clause, and pin `search_path`. The allergy policies should use those functions instead of bringing the allergy repo's own. |
| `006_allergy_schema.sql` | The allergy tables, adapted (see "Schema merge"). Adds `food_items.gtin text` (normalized, 14 digits) with an index. |
| `007_allergy_dictionary.sql` | Generated by `npm run gen:dictionary`, which already writes to this name. |
| `008_allergy_storage_and_cron.sql` | The `label-photos` private bucket and the cron jobs, in guarded blocks as in the allergy repo's `20261108000400`. |
| `009_allergy_discover.sql` | The `discover_products()` function |

**RLS tests.** Port `supabase-stub.sql`, and add `raw_user_meta_data jsonb` to its `auth.users`,
because pantry's signup trigger reads it. Write tests for the merged schema:

- the first test is the recursion regression;
- then household isolation for every pantry table and every allergy table;
- then the self-insert check.

**Edge Functions.**

- **Copy:** the 7 allergy functions, the hand-written `_shared` files (`env`, `http`, `clients`,
  `dictionary`, `store`, `claude`, `alerts`, `watchlist`), `deno.json`, `deno.lock` and the Deno
  tests. Then run `sync:shared`.
- **CORS:** they already answer browser requests. `handle()` in `_shared/http.ts` answers the
  OPTIONS preflight.
- **Table renames:** update every reference to the renamed tables. Search for `profiles`,
  `profile_allergens` and `profile_custom_avoids` in:
  - `chef-card`;
  - `_shared/store.ts` (`householdProfiles`);
  - `sync-recalls`;
  - `check-ingredient-changes`;
  - the RLS policies, the discovery function and the tests.

  `householdProfiles()` in `store.ts` uses embedded selects such as `profile_allergens(...)`. When
  the tables are renamed, the keys in the response change too (for example `p.profile_allergens`).
- **`supabase/config.toml`:** keep pantry's entries. Add `verify_jwt = false` for `sync-recalls` and
  `check-ingredient-changes`. They check `x-cron-secret` themselves.

**Pantry items in alerts.** Extend `_shared/watchlist.ts` so recall and ingredient-change checks
include active `food_items` that have a GTIN. This is what makes "a recalled product is in your
pantry" alerts work.

**One barcode lookup.**

- Move the add page and the Check page to `lookup-product`. It also returns categories, image and
  quantity.
- Move `barcode-lookup`'s `mapCategory` into `src/utils` and apply it on the client.
- Delete `barcode-lookup` once nothing calls it.

**Label photos on the web.**

1. A file input with `capture="environment"`.
2. Shrink the photo to at most 2000 px wide with a canvas, as JPEG.
3. Upload it to `label-photos/<household_id>/<uuid>.jpg`.
4. Call `extract-label` with `ocrText: ''`. Browsers have no on-device OCR, so `agreement` comes back
   null and only a missing transcription triggers a retake.
5. Show a review page where the person checks Claude's text against the photo.
6. Call `save-label-product`.
7. Show the verdict.

For a photo that Claude read and the person confirmed, the engine's confidence label is "From your
photo" (`engine.ts`, near line 412). Ask Brian whether that wording is enough. Changing it is an
engine change, so it needs a test.

**Other server features:**

- chef card translations through the `chef-card` function;
- an Alerts page with an unread count;
- no web push yet.

**Secrets to set, with Brian:**

- `ANTHROPIC_API_KEY`, `USDA_API_KEY`, `OFF_USER_AGENT` and `CRON_SECRET`;
- optionally `OPENFDA_API_KEY`;
- the Vault entries the cron migration reads;
- `OPENAI_API_KEY` for pantry's existing functions.

**Supabase version of the data module.** Write it, with React Query for caching.

**Then ask Brian** whether to also connect pantry's own pages (inventory, shopping, recipes) to
Supabase. That is pantry work beyond the allergy features, and it touches every page.

### Step 4: later (each its own task; ask Brian first)

- **Recipe checks.**
  - These can show red ("uses butter: milk") or yellow, but never green. Ingredient names are not
    labels, and a packaged ingredient can contain allergens its name doesn't show.
  - Where nothing matches, say "No listed ingredient matched. Check the labels of packaged
    ingredients."
  - Test this rule.
- **Shopping list checks.** Carry the GTIN when an item is added from the Check page, and show
  verdicts only for items that have product data.
- **Discover.** Search for products that are safe for the selected people (`search-products` and
  `discover_products`).
- **Wrong-data reports** (`data_reports`).
- **A PWA (an installable web app) with an offline cache**, and web push.
- **Review the 48 Claude-added dictionary terms with Brian.**
- **The remaining items in OPEN_QUESTIONS.md.** For example: refined oils as green per profile, and
  FSIS returning HTTP 403.

## Schema merge

Keep pantry's household model, and attach the allergy tables to it.

**Keep pantry's:**

- `user_profiles`;
- `households` (`owner_id` references `user_profiles`, plus `invite_code`);
- `household_members` (an `id` primary key, and roles `owner`, `admin` and `member`);
- the `handle_new_user` trigger, which creates a household and a default shopping list at signup;
- `join_household_by_invite()`.

**Don't bring from the allergy schema:**

- its `households` and `household_members` tables;
- the `create_household()`, `join_household()` and `rotate_invite_code()` functions.

`_shared/clients.ts` `requireMember()` queries `household_members` by `household_id` and `user_id`,
which pantry's table also has.

**Bring, renamed where noted:**

| Allergy table | In pantry | Notes |
| --- | --- | --- |
| `profiles` | `allergy_profiles` | A person being protected. They may have no account (for example a child). |
| `profile_allergens` | `allergy_profile_allergens` | |
| `profile_custom_avoids` | `allergy_profile_avoids` | |
| `allergens`, `allergen_terms`, `dictionary_meta` | same | Global, read-only to clients |
| `products`, `product_signals`, `product_versions` | same | Global; household-photo rows are private to the household |
| `saved_products`, `scans`, `label_photos`, `alerts`, `chef_cards`, `data_reports` | same | Household-scoped |
| `recalls`, `recall_matches`, `search_cache` | same | Global |
| `user_settings` | same | The functions read it. pantry's `user_profiles.preferences` could hold it later. |
| `push_tokens` | same, for now | Depends on Brian's answer about the phone app |

Allergy foreign keys to `households(id)` work unchanged, because both use uuid ids. Columns like
`created_by` that reference `auth.users(id)` are fine as they are.

## Native pieces and their web versions

| In the phone app | On the web |
| --- | --- |
| Native camera barcode scanning | `BarcodeDetector`, plus a polyfill for Safari and Firefox. Typing the number always works. |
| On-device OCR (`label-ocr`) | None. Claude transcribes and the person checks the text. Tesseract.js could add a second reading, but its download is large. Not for now. |
| SQLite cache and offline outbox | React Query cache for now. Offline use is step 4. |
| Expo push | In-app alerts for now. Web push is step 4. |
| Image view-shot for chef cards | A print stylesheet, copy-text and the Web Share API |
| Local mode | pantry's demo mode |

## Reproducing the RLS recursion

Run this from `/Users/brian/Projects/food-allergy-app`, where `@electric-sql/pglite` is installed.
Save it as a `.mjs` file in that folder (Node resolves packages from the script's folder), run it,
then delete it.

```js
// node check.mjs supabase/tests/supabase-stub.sql /Users/brian/Projects/pantry-app/supabase/migrations/001_initial_schema.sql
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { readFileSync } from 'node:fs';
const [stub, schema] = process.argv.slice(2);
const db = new PGlite({ extensions: { pgcrypto, uuid_ossp } });
await db.exec('create extension if not exists pgcrypto;');
await db.exec(readFileSync(stub, 'utf8'));
await db.exec('create publication supabase_realtime; alter table auth.users add column raw_user_meta_data jsonb;');
await db.exec(readFileSync(schema, 'utf8'));
const uid = '11111111-1111-1111-1111-111111111111';
await db.exec(`insert into auth.users (id, email) values ('${uid}', 'a@example.com');`);
for (const sql of ['select household_id from public.household_members', 'select id from public.food_items', 'select id from public.households']) {
  try {
    await db.transaction(async (tx) => {
      await tx.exec(`set local role authenticated; select set_config('request.jwt.claim.sub', '${uid}', true);`);
      console.log('OK  ', sql, (await tx.query(sql)).rows.length);
    });
  } catch (e) { console.log('FAIL', sql, e.message); }
}
```

Output on 2026-11-11: all three lines say `FAIL ... infinite recursion detected in policy for
relation "household_members"`.

## How to check your work

- `npm test`: engine, food-data and (from step 3) RLS tests. None of them call a live API.
- `npm run test:deno`: the Edge Function shared tests.
- `npm run build`: passes from step 0 onward.
- `npm run lint`: no new errors beyond the existing backlog.
- Storybook: a story for each new component; run `npm run build-storybook`.
- In the browser: start the `pantry-app` entry from `.claude/launch.json`. Walk through the
  milestone-1 checks at phone width and at desktop width.
- Products to try:
  - barcode `044000037451` (Nutter Butter). In the phone app's Simulator test it gave "Contains
    peanuts (peanut butter, peanuts)" from live Open Food Facts data.
  - `fixtures/labels/` has 65 labels with hand-checked answers, which you can use as demo data.

## Working rules

- **Writing.** Brian's global CLAUDE.md applies: plain, direct language in code comments, docs and
  commit messages.
- **Records.** Keep `docs/allergy/DECISIONS.md` and `docs/allergy/OPEN_QUESTIONS.md` in pantry-app.
  Start them from food-allergy-app's copies, and add new decisions as you make them.
- **Ask Brian before:**
  - creating or linking a Supabase project;
  - deploying;
  - setting secrets;
  - adding a paid service;
  - running anything that spends API money.
- **Never print or commit keys.**
- **Don't bypass bot protection.** FSIS blocks automated requests; the code identifies itself
  honestly and skips FSIS when refused.
