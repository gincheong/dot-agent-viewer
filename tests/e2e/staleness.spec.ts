import { _electron as electron, expect, test } from '@playwright/test'
import path from 'node:path'

import { buildFixtureScanResult } from './fixtures'

/**
 * ScanStaleLabel:
 *  - Just after Refresh under the installed fake clock: label reads
 *    "Last scanned: just now", no stale pill.
 *  - After fastForward(65s): label reads "1m ago", stale pill appears.
 *  - Clicking Refresh re-runs rescan (re-stamping scannedAt = Date.now() under
 *    the fake clock) → label resets to "just now", pill disappears.
 *
 * This spec doesn't use the shared `firstWindow` fixture because we must
 * install the clock BEFORE the renderer mounts its `setInterval(60_000)` —
 * otherwise the timers Mount under the real clock and never fire when
 * Date.now() is advanced.
 */
test('ScanStaleLabel ticks past 60s, shows pill, and resets on Refresh', async () => {
  const mainEntry = path.join(__dirname, '../../out/main/index.js')
  const app = await electron.launch({
    args: [mainEntry],
    env: { ...process.env, NODE_ENV: 'test' },
  })
  const win = await app.firstWindow()

  // Install the fake clock as soon as the window is up. addInitScript runs on
  // every navigation, so install BOTH the init script (which seeds the
  // scan fixture and patches Date so the renderer never sees the real wall
  // clock) and then reload — the renderer's intervals are set against the
  // fake clock.
  await win.clock.install()

  const fixture = buildFixtureScanResult()
  await win.addInitScript((serialized: string) => {
    ;(window as unknown as { __testScanResult: unknown }).__testScanResult =
      JSON.parse(serialized)
  }, JSON.stringify(fixture))
  await win.reload()
  await win.waitForSelector('.source-item__name', { timeout: 10_000 })

  // The store's test-mode rescan stamps scannedAt = Date.now() (fake clock).
  // The boot rescan already ran on mount, so label should already read
  // "just now" under the fake clock.
  await expect(win.locator('.scan-stale')).toContainText('just now')
  await expect(win.locator('.scan-stale__pill')).toHaveCount(0)

  // Fast-forward past the 60s stale threshold AND the 60s setInterval so the
  // hook's tick state increments and re-renders the label.
  await win.clock.fastForward(65_000)

  await expect(win.locator('.scan-stale__pill')).toHaveText('stale')
  await expect(win.locator('.scan-stale')).toContainText('1m ago')

  // Click Refresh — rescan re-stamps scannedAt under the fake clock.
  await win.locator('.refresh-button').click()

  await expect(win.locator('.scan-stale__pill')).toHaveCount(0)
  await expect(win.locator('.scan-stale')).toContainText('just now')

  await app.close()
})
