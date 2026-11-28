import { defineConfig, devices } from '@playwright/test'
import { chromiumExecutablePath } from './scripts/chromium-path'

// End-to-end tests. They build the app in demo mode (no Supabase), serve the
// build with `vite preview`, and drive it in Chromium at phone and desktop sizes.
// Demo mode keeps all data in localStorage, so the tests need no network and no
// secrets. See e2e/README.md.

const PORT = 4317
const executablePath = chromiumExecutablePath()

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry in CI records a trace for the failure. A test that passes only on
  // retry is still reported as flaky in the summary.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }], ['github']] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Fixed so date labels ("Today", "Tomorrow") match what the tests compute
    timezoneId: 'UTC',
    locale: 'en-US',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    // Builds into its own folder so it never overwrites a real `dist` build
    command: `vite build --outDir dist-e2e --emptyOutDir && vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Empty values force demo mode even if a developer has a .env.local with real keys.
    // Vite gives variables already in the environment priority over .env files.
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
    },
  },
})
