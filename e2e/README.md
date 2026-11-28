# End-to-end tests

Playwright tests that use the real app in a browser.

```bash
npm run test:e2e                         # all tests, phone and desktop
npx playwright test e2e/pantry.spec.ts   # one file
npx playwright test --project mobile     # phone size only
npx playwright test --ui                 # watch it run (needs a display)
```

## How it works

`playwright.config.ts` builds the app into `dist-e2e/` with the Supabase variables empty, so the app runs in demo mode, and serves it with `vite preview` on port 4317. Each test gets a fresh browser context, so localStorage (and the demo data) starts clean every time.

Every test runs twice: as a Pixel 7 phone (`mobile`) and as a 1280 px wide desktop (`desktop`). Use the `isMobile` fixture when the two layouts differ, for example the bottom nav on phones and the side nav on desktop.

## Rules built into the fixtures

Import `test` and `expect` from `./fixtures`, not from `@playwright/test`. The page fixture fails the test when:

- the app throws an uncaught error or calls `console.error`
- the app requests any host other than the local server

If a flow needs an outside API, serve a recorded response with `page.route()`. `routeOpenFoodFacts(page, file)` serves a file from `fixtures/api/off/`. Never let a test call a real outside service.

## Writing tests

- Find elements by role and accessible name (`getByRole('button', { name: 'Save' })`), the way a person using a screen reader would. If an element has no accessible name, give it one in the component (for example `aria-label`) rather than reaching for CSS selectors.
- Use the helpers in `fixtures.ts`: `signInDemo`, `openSettings`, `mainNav`.
- Assert on what the user sees: text, headings, URLs.
- Do not use fixed waits (`waitForTimeout`). `expect(...)` retries until the condition holds.
- Use made-up item names (like "Dragon Fruit") so the test does not depend on the demo data.
