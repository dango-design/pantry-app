import { defineConfig } from 'vitest/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import path from 'path'
import { chromiumExecutablePath } from './scripts/chromium-path'

const executablePath = chromiumExecutablePath()

// Two projects:
// - unit: Node tests for the allergy packages, the web app's logic, and (from step 3) the RLS tests.
//   `npm test` runs only this one.
// - storybook: renders every story in src/stories in headless Chromium and runs its play function.
//   A story that throws, or whose play function fails, fails the run. `npm run test:stories`.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['packages/*/test/**/*.test.ts', 'src/**/*.test.ts', 'supabase/tests/**/*.test.ts'],
          testTimeout: 30_000,
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(__dirname, '.storybook') })],
        // Pre-bundled up front. Otherwise Vite finds it mid-run on a cold cache (as in CI),
        // reloads the browser, and the stories loading at that moment fail to import.
        optimizeDeps: { include: ['react/jsx-dev-runtime'] },
        test: {
          name: 'storybook',
          setupFiles: ['.storybook/vitest.setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions: executablePath ? { executablePath } : {} }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
