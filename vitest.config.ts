import { defineConfig } from 'vitest/config'

// Node tests for the allergy packages (and, from step 3, the RLS tests).
// Storybook's vitest addon is installed but not configured, so this config only covers these.
export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'supabase/tests/**/*.test.ts'],
    testTimeout: 30_000,
  },
})
