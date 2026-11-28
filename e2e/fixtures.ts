import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test as base, expect, type Page } from '@playwright/test'

// Every test gets a page that:
// - fails the test if the app throws an uncaught error or logs console.error
// - fails the test if the app requests any host other than the local server.
//   A test that expects an outside request (e.g. Open Food Facts) routes it
//   with page.route(), which takes priority over the catch-all below.
export const test = base.extend({
  page: async ({ page, context, baseURL }, use) => {
    const problems: string[] = []
    const local = new URL(baseURL!).origin

    page.on('pageerror', (err) => problems.push(`Uncaught error: ${err.message}`))
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      // Chromium logs every 4xx/5xx response this way. For outside hosts that is a
      // response the test chose (or a request the route check below already reports).
      const from = msg.location().url
      if (msg.text().startsWith('Failed to load resource') && from && !from.startsWith(local)) return
      problems.push(`console.error: ${msg.text()}`)
    })

    await context.route(
      (url) => url.origin !== local,
      async (route) => {
        const url = new URL(route.request().url())
        // index.html loads the Inter font from Google. Serve an empty stylesheet instead.
        if (url.hostname === 'fonts.googleapis.com') {
          return route.fulfill({ status: 200, contentType: 'text/css', body: '' })
        }
        problems.push(`Unexpected request to ${url.origin}${url.pathname}. Route it in the test if it is expected.`)
        return route.abort()
      },
    )

    await use(page)

    expect(problems, 'The app logged errors or made unexpected network requests').toEqual([])
  },
})

export { expect }
export type { Page } from '@playwright/test'

/** Signs in with the demo account and waits for the Pantry tab. */
export async function signInDemo(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: /try demo/i }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Pantry' })).toBeVisible()
}

/** Serves a recorded Open Food Facts response from fixtures/api/off/ for every product read. */
export async function routeOpenFoodFacts(page: Page, fixtureFile: string, status = 200) {
  const path = fileURLToPath(new URL(`../fixtures/api/off/${fixtureFile}`, import.meta.url))
  const body = readFileSync(path, 'utf8')
  await page.route('https://world.openfoodfacts.org/api/v2/product/**', (route) =>
    route.fulfill({ status, contentType: 'application/json', body }),
  )
}

/** Opens Settings: the header button on phones, the side nav link on desktop. */
export async function openSettings(page: Page) {
  await page
    .getByRole('button', { name: 'Settings', exact: true })
    .or(mainNav(page).getByRole('link', { name: 'Settings', exact: true }))
    .first()
    .click()
  await expect(page).toHaveURL('/settings')
}

/** The main navigation: the bottom bar on phones, the side bar from tablet width up. */
export function mainNav(page: Page) {
  return page.getByRole('navigation', { name: 'Main' })
}
