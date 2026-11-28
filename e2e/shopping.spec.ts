import { test, expect, signInDemo, type Page } from './fixtures'

test.beforeEach(async ({ page }) => {
  await signInDemo(page)
  await page.goto('/shopping')
})

async function addToList(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Item to add to your shopping list' }).fill(name)
  await page.getByRole('button', { name: 'Add to shopping list' }).click()
  await expect(page.getByRole('checkbox', { name })).toBeVisible()
}

test('an item can be added to and removed from the list', async ({ page }) => {
  await addToList(page, 'Dragon Fruit')
  await page.getByRole('button', { name: 'Remove Dragon Fruit from list' }).click()
  await expect(page.getByRole('checkbox', { name: 'Dragon Fruit' })).toBeHidden()
})

test('checked items are put away into the pantry', async ({ page }) => {
  await addToList(page, 'Dragon Fruit')
  await page.getByRole('checkbox', { name: 'Dragon Fruit' }).check()
  await expect(page.getByRole('checkbox', { name: 'Dragon Fruit' })).toBeChecked()

  await page.getByRole('button', { name: 'Add to pantry' }).click()
  const sheet = page.getByRole('dialog', { name: 'Add to pantry' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByText('Dragon Fruit', { exact: true })).toBeVisible()
  await sheet.getByRole('button', { name: /^Add \d+ items?$/ }).click()
  await expect(sheet).toBeHidden()

  // Put away items leave the list
  await expect(page.getByRole('checkbox', { name: 'Dragon Fruit' })).toBeHidden()

  // ...and are in the pantry
  await page.goto('/')
  await page.getByRole('searchbox', { name: /^Search \d+ items$/ }).fill('dragon')
  await expect(page.getByRole('button', { name: /^Dragon Fruit / })).toBeVisible()
})

test('a usual item chip adds that item to the list', async ({ page }) => {
  const chip = page.getByRole('list', { name: 'Usual items' }).getByRole('button').first()
  const label = await chip.getAttribute('aria-label')
  const name = label?.replace(/^Add \d+(\.\d+)? /, '')
  expect(name, `Unexpected chip label: ${label}`).toBeTruthy()

  await chip.click()
  await expect(page.getByRole('checkbox', { name: name! })).toBeVisible()
})
