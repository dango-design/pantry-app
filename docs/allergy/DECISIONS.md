# Decisions

Choices made while building, with the reason for each. Newest at the bottom of each section.
The build plan is the Claude Doc "Food Allergy App: Claude Code Build Plan" (2026-11-08).

## Verdict engine

- **A longer phrase hides shorter terms only for its own allergen.** "Peanut oil" (possible) hides
  "peanut" (definite) for peanut, and nothing else. This keeps the plan's invariant "adding an
  allergen term never turns red into green": a new term can only add signals for other allergens.
  It is tested over 200 random inputs.
- **"Not this allergen" phrases are guards: terms with strength `none`.** Example: "cocoa butter" is a
  milk guard, so "butter" inside it does not flag milk. A guard is a mapping too, so it needs a source
  like any other term. Guards Claude added hide nothing until a person reviews them.
- **Terms Claude added count only as "possible" until reviewed, and every term has a `source_url`.**
  The plan asks for both. Most terms are transcribed from FARE's per-allergen pages, FDA, the Open
  Food Facts allergen and ingredient taxonomies, EU Regulation 1169/2011 and the Celiac Disease
  Foundation, and are marked `import`. Terms Claude proposed (for example some fish names from the FDA
  Seafood List, sulfiting agents from 21 CFR 182) are marked `claude` with a supporting link. The
  Settings screen shows how many are waiting for review.
- **Tree nuts follow FDA's January 2025 list of 12.** Coconut, chestnut, shea and the other removed nuts
  are not tree nuts. Coconut is its own allergen. A printed "Contains: tree nuts (coconut)" still
  flags tree nuts, because the label wins.
- **Shellfish means crustaceans.** Molluscs (clams, squid, oysters) are a separate optional allergen,
  as in US law.
- **Highly refined oils are "possible" (yellow).** Soybean oil, peanut oil and "vegetable oil
  (soybean)" flag yellow. Oils that say cold-pressed, expeller-pressed, extruded or unrefined are
  "contains". The open question about letting a profile treat refined oils as green is not built yet.
- **"X, Y, and/or Z oil" is read as a list of oils.** "corn, soybean, and/or canola oil" reads soybean
  as soybean oil (possible), not soybeans (contains). Only known oil-source words join such a list.
- **Vague words ("natural flavors", "spices") never flag the 9 majors on a US label**, because FALCPA
  requires majors to be declared even inside flavorings. They flag yellow for non-major allergens and
  custom avoids, and for majors when the label is not from the US.
- **Sources that disagree (word overlap under 50%) make every protected profile at least yellow.**
- **A stray or missing bracket is a note, not a yellow verdict.** Every word is still matched, so a
  bracket problem cannot hide an allergen; it only changes which ingredient is the parent. Open Food
  Facts text often has these. Unreadable text (OCR junk, "[illegible]") does make the verdict yellow.
- **The result screen shows one line per allergen** (the strongest finding, with its words merged),
  and highlights only the words that matter for the people selected. The engine still returns every
  reason, so nothing is lost.
- **Overall verdict order is red > unknown > yellow > green.** Unknown means "we have no ingredients",
  which is a stronger warning than "check one thing".
- **In-store barcodes (prefixes 02, 04, 20-29) are "Store-made item: ask staff"** unless the household
  photographed that label, in which case the photo is evaluated.
- **Custom avoids:** a direct match is red; a match in a "may contain" sentence is red when severe,
  yellow otherwise; vague words make them yellow.

## Backend

- **Edge Functions use a copy of the shared packages** (`supabase/functions/_shared/`), made by
  `pnpm sync:shared`. Deno has no workspace packages, and Supabase deploys only files under
  `supabase/functions`. CI fails if the copy is out of date.
- **Products are written only by Edge Functions**, including household-photo products
  (`save-label-product`), so allergen signals are always computed by the engine on the server.
- **`products` has a plain unique constraint on (source, source_id)** instead of a partial index, so
  upserts work through the Supabase API. Household-photo rows have no source_id, and NULLs never
  collide.
- **RLS is tested in PGlite** (Postgres compiled to WebAssembly) with a small stand-in for Supabase's
  auth schema, because Docker is not installed on this Mac. `supabase test db` would need Docker.
- **Chef card English is fixed text built from the profile**; Claude only translates it. The English
  card therefore works offline right away, and the translation is shown above the English.
- **Translations and Sonnet label retries opt into `fallbacks: "default"`** (beta header
  `server-side-fallback-2026-07-01`). If a safety classifier declines, the API re-runs the request on
  Anthropic's recommended fallback model instead of failing. Claude Haiku 5.5 has no server-side
  fallback; a declined or low-confidence Haiku answer goes to Sonnet.
- **Label transcription uses structured outputs** (`output_config.format` with a JSON schema). The
  schema has no verdict field, and a Deno test checks that.
- **Translations use `claude-opus-5-5` at low effort.** The plan did not name a model for chef cards.
- **Ingredient-change checks run daily and refetch only products older than 7 days**, about 110
  seconds per run, paced at one Open Food Facts read every 4.2 seconds. Each product is still checked
  about once a week, as the plan asks, without one long run hitting the Edge Function time limit.
- **FSIS recalls are skipped when FSIS refuses the request.** FSIS returned HTTP 403 (bot protection)
  to every request from this Mac. The client identifies itself honestly and does not pretend to be a
  browser. The FSIS parser follows FSIS's documented field names but has not seen a live response.
- **USDA lookups try the 12-digit UPC, then the 14-digit form.** Recorded responses showed some
  products match only one form, and FDC search is full text, so results are filtered by exact
  `gtinUpc`.

## App

- **Local mode.** With no Supabase URL and key in the build, the app keeps everything on the phone and
  looks barcodes up straight from Open Food Facts. This exists so the app can be built and tested
  before the Supabase project exists. It is not meant for daily use.
- **Profiles are edited online in cloud mode** (server first, then the phone's copy). Scans, saved
  lists and wrong-data reports are written to the phone first and sent through an outbox, because they
  happen in stores with no signal.
- **Photos are shrunk to 2000 px wide before upload.** Claude downsizes larger images anyway.
- **OCR-only results are a separate path**: offline or in local mode the phone's OCR text is shown as
  "Read by the phone only (OCR)" and the photo is queued for Claude.
- **Expo Router with native tabs** (Scan, Discover, Saved, Alerts, Settings) and a root stack for
  the result, photo, review, profile and chef-card screens.
- **Two web-oriented lint rules are off** (`react/no-unescaped-entities`, `import/namespace`); quotes in
  React Native text are not HTML, and TypeScript already checks the imports.

## pantry-app integration

Decisions made while moving the allergy checker into pantry-app. The plan is
[../ALLERGY_INTEGRATION.md](../ALLERGY_INTEGRATION.md). Everything above this section was copied from
food-allergy-app on 2026-11-13.

- **Demo-first, Supabase project chosen at step 3, Expo app retired** (Brian, 2026-11-13). pantry-app
  now owns the engine, the dictionary and food-data. food-allergy-app is no longer kept in step.
- **The packages are copied unchanged.** Their 156 engine tests and 19 food-data tests pass under
  pantry's vitest 4 and TypeScript 5.6 with no edits. (food-allergy-app used vitest 5 and
  TypeScript 6.0.)
- **npm workspaces link the packages** (`"workspaces": ["packages/*"]`), so the app imports
  `@allergy/verdict-engine` and `@allergy/food-data` by name. food-data's dependency on the engine is
  `"*"`, because npm does not understand `workspace:*`.
- **ESLint allows irregular whitespace inside regexes in `packages/`.** `normalize.ts` matches a
  literal non-breaking space. The engine file stays exactly as copied.
- **`test:deno` and the `deno` package wait for step 3.** The Deno tests import `_shared/claude.ts`
  and `_shared/dictionary.ts`, which come with the Edge Functions in step 3. Until then there is
  nothing for Deno to run.
- **`gen:dictionary` writes `supabase/migrations/005_allergy_dictionary.sql`.** It is not run yet: the
  seed needs the tables from `004_allergy_schema.sql` (step 3).
- **`supabase/functions/_shared/verdict-engine` and `_shared/food-data` are generated now** by
  `npm run sync:shared`, so `npm run check:shared` passes from the start. ESLint ignores them.
