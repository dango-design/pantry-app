import { test, expect, signInDemo, type Page } from './fixtures'

test.beforeEach(async ({ page }) => {
  await signInDemo(page)
})

function searchBox(page: Page) {
  return page.getByRole('searchbox', { name: /^Search \d+ items$/ })
}

/** Reads the number of items from the search box's name ("Search 66 items"). */
async function itemCount(page: Page): Promise<number> {
  const snapshot = await searchBox(page).ariaSnapshot()
  const match = snapshot.match(/Search (\d+) items/)
  if (!match) throw new Error(`Could not read the item count from the search box: ${snapshot}`)
  return Number(match[1])
}

async function addItem(page: Page, name: string) {
  await page.goto('/add')
  await page.getByPlaceholder('e.g. Chicken Breast').fill(name)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL('/')
}

test('an item added by hand shows up in the pantry and survives a reload', async ({ page }) => {
  const before = await itemCount(page)

  await addItem(page, 'Dragon Fruit')

  await expect(searchBox(page)).toHaveAccessibleName(`Search ${before + 1} items`)
  await searchBox(page).fill('dragon')
  await expect(page.getByRole('button', { name: /^Dragon Fruit / })).toBeVisible()

  await page.reload()
  await expect(searchBox(page)).toHaveAccessibleName(`Search ${before + 1} items`)
  await searchBox(page).fill('dragon')
  await expect(page.getByRole('button', { name: /^Dragon Fruit / })).toBeVisible()
})

test('save stays disabled until the item has a name', async ({ page }) => {
  await page.goto('/add')
  const save = page.getByRole('button', { name: 'Save' })
  await expect(save).toBeDisabled()
  await page.getByPlaceholder('e.g. Chicken Breast').fill('Kiwi')
  await expect(save).toBeEnabled()
  await page.getByPlaceholder('e.g. Chicken Breast').fill('')
  await expect(save).toBeDisabled()
})

test('search narrows the list to matching items', async ({ page }) => {
  await searchBox(page).fill('salmon')
  await expect(page.getByRole('button', { name: /^Salmon Fillets / })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Chicken Thighs / })).toBeHidden()
})

test('an item opens its detail page', async ({ page }) => {
  await searchBox(page).fill('salmon')
  await page.getByRole('button', { name: /^Salmon Fillets / }).click()
  await page.getByRole('button', { name: 'Details' }).click()
  await expect(page).toHaveURL(/\/item\/[^/]+$/)
  await expect(page.getByText('Salmon Fillets').first()).toBeVisible()
})

test('marking an item used up removes it from the pantry', async ({ page }) => {
  await addItem(page, 'Dragon Fruit')
  const before = await itemCount(page)

  await searchBox(page).fill('dragon')
  await page.getByRole('button', { name: /^Dragon Fruit / }).click()
  await page.getByRole('button', { name: 'Mark Dragon Fruit used up' }).click()

  await expect(page.getByRole('button', { name: /^Dragon Fruit / })).toBeHidden()
  await expect(searchBox(page)).toHaveAccessibleName(`Search ${before - 1} items`)
})

test('adding an in-stock item to the list asks first, and "Buy more" keeps it in the pantry', async ({ page }) => {
  await addItem(page, 'Dragon Fruit')
  await searchBox(page).fill('dragon')
  await page.getByRole('button', { name: /^Dragon Fruit / }).click()
  await page.getByRole('button', { name: 'Add Dragon Fruit to shopping list' }).click()

  const sheet = page.getByRole('dialog', { name: 'You still have Dragon Fruit' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: /Buy more/ }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('button', { name: /^Dragon Fruit / })).toBeVisible()

  await page.goto('/shopping')
  await expect(page.getByRole('checkbox', { name: 'Dragon Fruit' })).toBeVisible()
})

test('"I\'m out of it" moves an item from the pantry to the list', async ({ page }) => {
  await addItem(page, 'Dragon Fruit')
  await searchBox(page).fill('dragon')
  await page.getByRole('button', { name: /^Dragon Fruit / }).click()
  await page.getByRole('button', { name: 'Add Dragon Fruit to shopping list' }).click()

  const sheet = page.getByRole('dialog', { name: 'You still have Dragon Fruit' })
  await sheet.getByRole('button', { name: /I'm out of it/ }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('button', { name: /^Dragon Fruit / })).toBeHidden()

  await page.goto('/shopping')
  await expect(page.getByRole('checkbox', { name: 'Dragon Fruit' })).toBeVisible()
})
