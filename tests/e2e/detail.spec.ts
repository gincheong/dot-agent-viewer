import { expect, test } from './fixtures'

test('clicking a source populates the detail pane with frontmatter, symlinks, and nested metadata', async ({
  firstWindow,
}) => {
  // Click the gh-stack skill — it has nested-object metadata + 2 symlink refs.
  const ghStack = firstWindow.locator('.source-item__name', { hasText: 'gh-stack' })
  await expect(ghStack).toBeVisible()
  await ghStack.click()

  // Detail header reflects the selection.
  await expect(firstWindow.locator('.detail-header__title')).toHaveText('gh-stack')

  // Frontmatter table should render the top-level keys: description, metadata, name.
  const fmTable = firstWindow.locator('.fm-table')
  await expect(fmTable).toBeVisible()
  await expect(fmTable.locator('.fm-table__key', { hasText: 'description' })).toBeVisible()
  await expect(fmTable.locator('.fm-table__key', { hasText: 'metadata' })).toBeVisible()
  await expect(fmTable.locator('.fm-table__key', { hasText: 'name' })).toBeVisible()

  // metadata is a depth-1 nested object → renders as a sub-table with keys
  // `author` and `version`.
  const nested = firstWindow.locator('.fm-table__nested')
  await expect(nested).toBeVisible()
  await expect(nested.locator('.fm-table__nested-key', { hasText: 'author' })).toBeVisible()
  await expect(nested.locator('.fm-table__nested-key', { hasText: 'version' })).toBeVisible()

  // SymlinkList: two references (Claude + Gemini). Each agent group renders
  // its own `.symlink-group`; we expect at least two link rows total.
  const symlinkRows = firstWindow.locator('.symlink-row')
  await expect(symlinkRows).toHaveCount(2)
})
