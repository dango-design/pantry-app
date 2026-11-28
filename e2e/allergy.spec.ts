import { test, expect, signInDemo, routeOpenFoodFacts, type Page } from './fixtures'

// The allergy check end to end: profile -> barcode -> Open Food Facts -> verdict.
// Open Food Facts answers come from the recorded responses in fixtures/api/off/.

test.beforeEach(async ({ page }) => {
  await signInDemo(page)
})

async function addPerson(page: Page, name: string, allergens: string[]) {
  await page.goto('/settings/allergies')
  await page.getByRole('button', { name: 'Add a person' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'New person' })).toBeVisible()
  await page.getByRole('textbox', { name: /Name/ }).fill(name)
  const group = page.getByRole('group', { name: 'Allergens' })
  for (const allergen of allergens) {
    await group.getByRole('button', { name: allergen, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL('/settings/allergies')
  await expect(page.getByRole('button', { name: new RegExp(`^${name} `) })).toBeVisible()
}

async function checkBarcode(page: Page, barcode: string) {
  await page.goto('/check')
  await page.getByRole('textbox', { name: 'Barcode number' }).fill(barcode)
  await page.getByRole('button', { name: 'Check', exact: true }).click()
}

test('a product with a listed allergen is not safe for that person', async ({ page }) => {
  await routeOpenFoodFacts(page, 'product-0044000037451.json') // Nutter Butter
  await addPerson(page, 'Sam', ['Peanuts'])

  await checkBarcode(page, '044000037451')

  await expect(page.getByRole('heading', { level: 2, name: 'Peanut Butter Sandwich Cookie' })).toBeVisible()
  await expect(page.getByText('Not safe').first()).toBeVisible()
  await expect(page.getByText(/Contains peanuts/)).toBeVisible()
  // The matched words are highlighted in the ingredient list
  await expect(page.getByRole('region', { name: 'Ingredients' }).locator('mark').first()).toBeVisible()
})

test('a product without the allergen is not marked unsafe', async ({ page }) => {
  await routeOpenFoodFacts(page, 'product-0051600000013.json') // Lea & Perrins: fish, no sesame
  await addPerson(page, 'Ana', ['Sesame'])

  await checkBarcode(page, '051600000013')

  await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
  await expect(page.getByText('Not safe')).toHaveCount(0)
})

test('a barcode Open Food Facts does not know shows a not-found result', async ({ page }) => {
  await routeOpenFoodFacts(page, 'product-notfound-valid-checksum.json', 404)
  await addPerson(page, 'Sam', ['Peanuts'])

  await checkBarcode(page, '099999999990')

  await expect(page.getByText('Open Food Facts does not know this barcode.')).toBeVisible()
  // No ingredients means no verdict either way: never "safe"
  await expect(page.getByLabel('Unknown').first()).toBeVisible()
  await expect(page.getByText('Not safe')).toHaveCount(0)
  await expect(page.getByText(/^Safe$/)).toHaveCount(0)
})

test('digits that are not a barcode show an error without a lookup', async ({ page }) => {
  await addPerson(page, 'Sam', ['Peanuts'])

  // No Open Food Facts route: a request would fail the test
  await checkBarcode(page, '12345')

  await expect(page.getByText('That is not a product barcode. Check the digits and try again.')).toBeVisible()
})
