import { defineConfig } from 'vitest/config'
import path from 'path'

// Node tests: the allergy packages, the web app's allergy helpers, and (from step 3) the RLS tests.
// Storybook's vitest addon is installed but not configured, so this config only covers these.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts', 'src/**/*.test.ts', 'supabase/tests/**/*.test.ts'],
    testTimeout: 30_000,
  },
})
