import { test, expect, signInDemo, openSettings } from './fixtures'

test('a signed-out visitor is sent to the login page', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('the sign-up and forgot-password pages open from the login page', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Sign up' }).click()
  await expect(page).toHaveURL('/signup')
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible()

  await page.goto('/login')
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await expect(page).toHaveURL('/forgot-password')
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
})

test('demo sign-in opens the pantry, and sign-out returns to login', async ({ page }) => {
  await signInDemo(page)

  // A signed-in user who opens the login page goes back to the app
  await page.goto('/login')
  await expect(page).toHaveURL('/')

  await openSettings(page)
  await expect(page.getByText('demo@pantry.app')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()

  await expect(page).toHaveURL('/login')
  await page.goto('/')
  await expect(page).toHaveURL('/login')
})
