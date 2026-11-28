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
- **`gen:dictionary` writes `supabase/migrations/007_allergy_dictionary.sql`.** It is not run yet: the
  seed needs the tables from `006_allergy_schema.sql` (step 3). The numbers start at 006 because
  GitHub's `main` already has migrations 003 to 005.
- **`supabase/functions/_shared/verdict-engine` and `_shared/food-data` are generated now** by
  `npm run sync:shared`, so `npm run check:shared` passes from the start. ESLint ignores them.
- **Open Food Facts gets the app's name as `X-User-Agent` from the browser.** Browsers refuse to let a
  page set `User-Agent`. `fetchOffProduct` and `searchOff` take `userAgentHeader`; the default is still
  `User-Agent`, so the Edge Functions are unaffected. The contact address comes from
  `VITE_OFF_CONTACT_EMAIL`. Without it the header says "no contact set", as the phone app did.
- **Until step 3, barcodes are looked up from the browser in both modes.** The add page and the Check page
  ask Open Food Facts directly, through `src/allergy/lookup.ts`, with or without Supabase. pantry's
  `barcode-lookup` function and `lookupBarcode()` are no longer called. Step 3 moves both pages to
  `lookup-product` and deletes `barcode-lookup`.
- **The 15-reads-a-minute limit is counted in the page.** Each browser tab keeps its own count. Past the
  limit, the lookup answers from the cache and says to wait a minute.
- **A barcode with a wrong check digit is refused.** The phone app passed it on. On the web a typing slip
  is more likely, and looking it up could show some other product's verdict.
- **The pantry badge and the item page check everyone in the household. The Check page and the chef card
  check the people selected there.** The pantry is shared, so its badges are for everyone.
- **Badge words:** "Not safe for Sam", "Check first for Sam", "No listed allergens", "No ingredient list"
  and "Store-made: ask staff". Each has a shield icon (`ShieldX`, `ShieldAlert`, `ShieldCheck`,
  `ShieldQuestion`), so it never looks like a freshness label.
- **The allergy data has its own store** (`pantry-allergy-store`, version 1), apart from
  `pantry-demo-store`. `FoodItem.gtin` is optional, so `pantry-demo-store` keeps its version and nobody
  loses demo data.
- **The barcode polyfill is `barcode-detector` 3.2.3 (MIT, released 2026-10-19), with `zxing-wasm`
  3.1.6 pinned to the same version it uses.** The `.wasm` (about 950 KB) is served by this app instead of
  the package's default jsDelivr URL. Both load only when the browser has no `BarcodeDetector`.
- **A name filled in by a barcode is not re-guessed.** The add page's name lookup matches whole words, so
  "Peanut Butter Sandwich Cookie" matched "butter" and became dairy in the fridge. For a barcode product,
  the category comes from Open Food Facts, and storage and expiry use that category's defaults.
- **The item page offers "Scan barcode" for items typed by hand.** It saves the GTIN on the item, so the
  item gets a badge. The handoff's wording also said "or photograph the label"; label photos arrive in
  step 3, so the page does not offer them yet.
- **The allergy work is built on GitHub's `main` (2026-11-19).** The first build used a local `main` a
  month behind GitHub and conflicted in 19 files. Branch `allergy-on-main` replays it on `5cfe9cf` and
  drops the fixes `main` already had.
- **Check is not a phone tab.** `main`'s phone nav has four tabs and a centered +. Check is in the side
  nav (tablet and desktop) and a shield button beside the settings gear in each phone tab header. The
  item is `CHECK_NAV_ITEM` in `src/components/layout/navItems.ts`. Moving it into the phone nav means
  adding it to `BottomNav`.
- **The page header, side nav and bottom nav hide when printing**, and the side nav's padding goes, so
  the chef card prints alone.
- **ESLint ignores `.claude/`.** Claude Code keeps other sessions' worktrees there, and linting them
  doubled the count.
- **A pantry card checks every batch on it** (2026-11-21). `main` now shows one card per product for all
  its batches. The badge takes the worst checked result, so a warning always shows. It says "No listed
  allergens" only when every batch was checked, and "Not all checked" when a green product shares its
  card with batches typed by hand. Each batch's own item page shows that batch's result. The rule is
  `combinedBadge()` in `src/allergy/display.ts`, with tests.
