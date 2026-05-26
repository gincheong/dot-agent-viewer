import { expect, test } from './fixtures'

test('typing in the search bar narrows the source list to fuzzy matches', async ({
  firstWindow,
}) => {
  // Wait for the fixture to populate the list.
  await expect(firstWindow.locator('.source-item__name', { hasText: 'make-pr' })).toBeVisible()
  await expect(firstWindow.locator('.source-item__name', { hasText: 'release' })).toBeVisible()

  const input = firstWindow.locator('.search-bar__input')
  await input.fill('make-pr')

  // After the debounce window expires the list should contain make-pr but not release.
  await expect(firstWindow.locator('.source-item__name', { hasText: 'make-pr' })).toBeVisible()
  await expect(
    firstWindow.locator('.source-item__name', { hasText: 'release' }),
  ).toHaveCount(0)

  // Clear the search → release returns.
  await input.fill('')
  await expect(firstWindow.locator('.source-item__name', { hasText: 'release' })).toBeVisible()
})
