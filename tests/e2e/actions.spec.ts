import { expect, test } from './fixtures'
import { installActionSpies } from './preload-spies'

/**
 * Each click in the ActionBar should:
 *   - Invoke the matching registry handler with the right args
 *   - Show a transient inline status near the button
 *
 * The handlers are swapped for in-memory spies via `installActionSpies`
 * — no real `$EDITOR` spawn or clipboard write happens.
 */
test('ActionBar buttons invoke handlers via the registry and show transient status', async ({
  electronApp,
  firstWindow,
}) => {
  const spies = await installActionSpies(electronApp)

  // Select the make-pr item — its absPath is what we'll assert against.
  await firstWindow.locator('.source-item__name', { hasText: 'make-pr' }).click()
  await expect(firstWindow.locator('.detail-header__title')).toHaveText('make-pr')

  const buttons = firstWindow.locator('.action-button')
  const openBtn = buttons.nth(0)
  const copyPathBtn = buttons.nth(1)
  const copyBodyBtn = buttons.nth(2)

  // copy-path -------------------------------------------------------------
  await copyPathBtn.click()
  await expect(
    firstWindow.locator(
      '.action-button-wrap:nth-child(2) .action-status[data-kind="ok"]',
    ),
  ).toHaveText('✓ copied')

  // open-editor -----------------------------------------------------------
  await openBtn.click()
  await expect(
    firstWindow.locator(
      '.action-button-wrap:nth-child(1) .action-status[data-kind="ok"]',
    ),
  ).toHaveText('✓ opened')

  // copy-body -------------------------------------------------------------
  await copyBodyBtn.click()
  await expect(
    firstWindow.locator(
      '.action-button-wrap:nth-child(3) .action-status[data-kind="ok"]',
    ),
  ).toHaveText('✓ copied')

  // The spy should record each call with the right payload.
  const calls = await spies.getCalls()
  expect(calls).toEqual(
    expect.arrayContaining([
      { name: 'copyPath', absPath: '/tmp/.agents/commands/make-pr.md' },
      { name: 'openEditor', absPath: '/tmp/.agents/commands/make-pr.md' },
      expect.objectContaining({ name: 'copyBody' }),
    ]),
  )
  const copyBodyCall = calls.find((c) => c.name === 'copyBody')
  expect(copyBodyCall).toBeDefined()
  if (copyBodyCall && copyBodyCall.name === 'copyBody') {
    expect(copyBodyCall.body).toContain('make-pr')
  }

  // Status should fade after the visibility window (1500ms) — assert via
  // hidden state, not by sleeping more than that. We poll until empty.
  await expect(async () => {
    const text = await firstWindow
      .locator(
        '.action-button-wrap:nth-child(3) .action-status[data-kind="ok"]',
      )
      .count()
    expect(text).toBe(0)
  }).toPass({ timeout: 3000 })
})
