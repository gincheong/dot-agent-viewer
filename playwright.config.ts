import { defineConfig } from '@playwright/test'

/**
 * Playwright is used here purely as an Electron driver (no browsers config).
 * Specs spin Electron via `_electron.launch()` from `tests/e2e/fixtures.ts`
 * and never use a web `page.goto()`, so no `projects` block is needed.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
})
