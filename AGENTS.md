# Working in this repo

Notes for coding agents (and people) changing this code.

## Check your work before you push

```bash
npm run verify
```

This runs every check CI runs, in the same order, and stops at the first failure. It needs no secrets and no network beyond `npm ci`. If it passes, CI should pass. A full run takes about two minutes.

To run one layer while you work:

| Command | What it checks | Time |
|---|---|---|
| `npm run lint` | ESLint. Warnings are allowed, errors fail. | ~10 s |
| `npm run typecheck` | The app, the config files, the E2E tests and both packages. | ~15 s |
| `npm run check:shared` | `supabase/functions/_shared` matches `packages/`. Fix with `npm run sync:shared`. | 1 s |
| `npm test` | Unit tests (Vitest, Node). | ~5 s |
| `npm run build` | Production build. | ~10 s |
| `npm run test:stories` | Renders every Storybook story in Chromium and runs its play function. | ~20 s |
| `npm run test:e2e` | Playwright: builds the app in demo mode and drives it at phone and desktop sizes. | ~40 s |

Run a single test file with `npx vitest run src/utils/stock.test.ts` or `npx playwright test e2e/pantry.spec.ts`.

CI (`.github/workflows/ci.yml`) runs on every push to every branch. When a CI job fails, read its log. For E2E failures, the run has a `playwright-report` artifact with a screenshot and trace for each failed test.

## Which tests to add

Add a test with every change in behaviour. Pick the lowest layer that can catch the bug:

- **Logic** (anything in `src/utils`, `src/stores`, helpers next to components, `packages/`): a unit test next to the file, named `<file>.test.ts`. Most bugs belong here. Use `vi.useFakeTimers()` and `vi.setSystemTime()` for anything that depends on today's date.
- **How a component looks in each state**: a story in `src/stories/`. Every story is a test: it fails if the component throws while rendering. Add a `play` function to test clicks and typing inside one component.
- **A user flow across pages** (add an item, put away shopping, check a barcode): a Playwright test in `e2e/`. See `e2e/README.md`.
- **A new route** in `src/App.tsx`: add it to `ROUTES` in `e2e/navigation.spec.ts`.

Do not skip, delete or weaken a failing test to get CI green. If a test is wrong, fix the test and say why in the commit message.

## Things that are easy to get wrong

- **Demo mode.** Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` the app runs on local data in `src/stores/demoStore.ts`. Story and E2E tests use demo mode. Supabase-backed code paths (`src/services/`) are not covered by automated tests yet, so test them by hand against a real project when you change them.
- **Database.** Read `supabase/README.md` before changing anything in `supabase/`. Never run `supabase db push`.
- **Shared allergy code.** Edit `packages/verdict-engine` and `packages/food-data`, then run `npm run sync:shared`. Never edit `supabase/functions/_shared/verdict-engine` or `_shared/food-data` by hand.
- **Allergy verdicts are safety-critical.** Changes to the verdict engine need tests in `packages/verdict-engine/test/`, including the fixture-based tests against real labels in `fixtures/labels/`.

## Browser for tests

Story and E2E tests use Chromium through Playwright. In CI and on a new machine, install it once with `npx playwright install chromium`. In Claude Code cloud sessions a Chromium is preinstalled at `/opt/pw-browsers/chromium` and the configs use it automatically (see `scripts/chromium-path.ts`). Set `PLAYWRIGHT_CHROMIUM_PATH` to use a different binary.
