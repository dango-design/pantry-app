import { test, expect, signInDemo, mainNav, openSettings } from './fixtures'

// Every route in src/App.tsx that needs no id from the data. Each must render its
// heading without errors. Add new routes here.
const ROUTES: Array<{ path: string; heading: string | RegExp }> = [
  { path: '/', heading: 'Pantry' },
  { path: '/recipes', heading: 'Recipes' },
  { path: '/plan', heading: 'Meal plan' },
  { path: '/shopping', heading: 'Shopping list' },
  { path: '/add', heading: 'Add item' },
  { path: '/recipe/new', heading: /recipe/i },
  { path: '/settings', heading: 'Settings' },
  { path: '/settings/household', heading: /household/i },
  { path: '/settings/allergies', heading: 'Allergies' },
  { path: '/settings/allergies/new', heading: 'New person' },
  { path: '/check', heading: 'Check a product' },
  { path: '/chef-card', heading: /chef card/i },
]

test.beforeEach(async ({ page }) => {
  await signInDemo(page)
})

for (const { path, heading } of ROUTES) {
  test(`${path} renders`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(path)
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  })
}

test('an unknown route goes to the pantry', async ({ page }) => {
  await page.goto('/no-such-page')
  await expect(page).toHaveURL('/')
})

test('the main navigation reaches every tab', async ({ page }) => {
  const nav = mainNav(page)
  const tabs = [
    { link: 'Recipes', path: '/recipes', heading: 'Recipes' },
    { link: 'Plan', path: '/plan', heading: 'Meal plan' },
    { link: 'Shopping', path: '/shopping', heading: 'Shopping list' },
    { link: 'Pantry', path: '/', heading: 'Pantry' },
  ]
  for (const tab of tabs) {
    await nav.getByRole('link', { name: tab.link, exact: true }).click()
    await expect(page).toHaveURL(tab.path)
    await expect(page.getByRole('heading', { level: 1, name: tab.heading })).toBeVisible()
  }
})

test('sub-pages show the side nav on desktop and a back button on phones', async ({ page, isMobile }) => {
  await page.goto('/')
  await openSettings(page)

  if (isMobile) {
    await expect(mainNav(page)).toBeHidden()
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL('/')
  } else {
    await expect(mainNav(page)).toBeVisible()
    await mainNav(page).getByRole('link', { name: 'Pantry', exact: true }).click()
    await expect(page).toHaveURL('/')
  }
})

test('a recipe opens from the recipes tab', async ({ page }) => {
  await page.goto('/recipes')
  await page.getByRole('heading', { name: 'Chicken Stir-Fry with Rice' }).click()
  await expect(page).toHaveURL(/\/recipe\/[^/]+$/)
  await expect(page.getByRole('heading', { level: 2, name: 'Chicken Stir-Fry with Rice' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Ingredients/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Instructions' })).toBeVisible()
})

test('the meal plan moves between weeks', async ({ page }) => {
  await page.goto('/plan')
  await expect(page.getByText(/^This week/)).toBeVisible()
  await page.getByRole('button', { name: 'Next week' }).click()
  await expect(page.getByText(/^This week/)).toBeHidden()
  await page.getByRole('button', { name: 'Previous week' }).click()
  await expect(page.getByText(/^This week/)).toBeVisible()
})
