import {
  buildBrokenLinkScanResult,
  expect,
  injectScanResult,
  test,
} from './fixtures'

/**
 * Fixture has a Claude symlink whose target is missing. The SymlinkList
 * should render the row with `data-broken="true"` and a "broken" danger pill.
 */
test('broken hub symlink renders the broken indicator in SymlinkList', async ({
  firstWindow,
}) => {
  await injectScanResult(firstWindow, buildBrokenLinkScanResult())

  await firstWindow
    .locator('.source-item__name', { hasText: 'orphan-command' })
    .click()
  await expect(firstWindow.locator('.detail-header__title')).toHaveText(
    'orphan-command',
  )

  const brokenRow = firstWindow.locator('.symlink-row[data-broken="true"]')
  await expect(brokenRow).toHaveCount(1)
  await expect(brokenRow.locator('.pill[data-tone="danger"]')).toHaveText(
    'broken',
  )
})
