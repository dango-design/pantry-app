import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

// Returns a Chromium binary for Playwright and Vitest browser mode to launch, or
// undefined to use the one Playwright downloaded (`npx playwright install chromium`).
//
// Set PLAYWRIGHT_CHROMIUM_PATH to use a specific binary. Without it, if the
// downloaded browser is missing but a preinstalled one is at /opt/pw-browsers
// (Claude Code cloud sessions have one there), that one is used.
export function chromiumExecutablePath(): string | undefined {
  const fromEnv = process.env.PLAYWRIGHT_CHROMIUM_PATH
  if (fromEnv) return fromEnv
  const preinstalled = '/opt/pw-browsers/chromium'
  if (!existsSync(chromium.executablePath()) && existsSync(preinstalled)) return preinstalled
  return undefined
}
