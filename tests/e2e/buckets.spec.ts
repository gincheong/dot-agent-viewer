import {
  buildHubOnlyScanResult,
  expect,
  injectScanResult,
  test,
} from './fixtures'

/**
 * Default fixture populates all three provenance buckets (agents-hub,
 * agent-local, external-link). All three group headers should be visible.
 */
test('all three provenance group headers render when buckets are populated', async ({
  firstWindow,
}) => {
  const headers = firstWindow.locator('.list-group__header')

  await expect(headers.filter({ hasText: 'Hub originals' })).toHaveCount(1)
  await expect(headers.filter({ hasText: 'Agent-local files' })).toHaveCount(1)
  await expect(headers.filter({ hasText: 'External links' })).toHaveCount(1)
})

/**
 * Hub-only fixture leaves agent-local and external-link empty. Those headers
 * should NOT render — the sidebar stays uncluttered (plan §5).
 */
test('empty provenance buckets hide their group headers', async ({
  firstWindow,
}) => {
  await injectScanResult(firstWindow, buildHubOnlyScanResult())

  const headers = firstWindow.locator('.list-group__header')

  await expect(headers.filter({ hasText: 'Hub originals' })).toHaveCount(1)
  await expect(headers.filter({ hasText: 'Agent-local files' })).toHaveCount(0)
  await expect(headers.filter({ hasText: 'External links' })).toHaveCount(0)
})
