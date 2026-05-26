import { expect, test } from './fixtures'

test('app boots with fixture data and shows the source list', async ({
  firstWindow,
}) => {
  // Window title is set in src/main/index.ts.
  await expect(firstWindow).toHaveTitle('dot-agent-viewer')

  // Sidebar should populate from the injected `window.__testScanResult` once
  // the React mount-time rescan runs. We assert against names known to be in
  // the fixture (`make-pr`, `release`, `gh-stack`, `GEMINI`).
  const list = firstWindow.locator('aside.sidebar')
  await expect(list).toBeVisible()

  await expect(firstWindow.locator('.source-item__name', { hasText: 'make-pr' })).toBeVisible()
  await expect(firstWindow.locator('.source-item__name', { hasText: 'gh-stack' })).toBeVisible()
  await expect(firstWindow.locator('.source-item__name', { hasText: 'GEMINI' })).toBeVisible()
})
