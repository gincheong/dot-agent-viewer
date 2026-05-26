// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FrontmatterTable } from '../../../src/renderer/components/FrontmatterTable'

afterEach(() => cleanup())

describe('FrontmatterTable', () => {
  it('renders a flat scalar key/value row', () => {
    render(<FrontmatterTable data={{ model: 'opus' }} />)
    expect(screen.getByText('model')).toBeTruthy()
    expect(screen.getByText('opus')).toBeTruthy()
  })

  it('renders comma-list string as text (with Show full toggle when >10 tokens)', () => {
    const allowedTools =
      'Bash, Read, Edit, Write, Glob, Grep, WebFetch, mcp__jira, mcp__playwright, mcp__figma, NotebookEdit, TodoWrite, SendUserFile'

    render(<FrontmatterTable data={{ 'allowed-tools': allowedTools }} />)

    // The key row exists.
    expect(screen.getByText('allowed-tools')).toBeTruthy()

    // 13-token comma list collapses to a preview + a "Show full" toggle.
    const toggle = screen.getByRole('button', { name: /show full/i })
    expect(toggle).toBeTruthy()

    // The full string is NOT visible in collapsed mode (preview shows
    // first 3 tokens + ", … (13 items)").
    const allRows = document.querySelectorAll('.fm-table__row')
    expect(allRows.length).toBe(1)
    expect(document.body.textContent).toContain('… (13 items)')
  })

  it('renders nested object at depth-1 as an indented sub-table', () => {
    render(
      <FrontmatterTable
        data={{
          metadata: {
            author: 'evan',
            version: '0.1.0',
          },
        }}
      />,
    )

    // Top-level key 'metadata' is rendered.
    expect(screen.getByText('metadata')).toBeTruthy()

    // Both nested keys render via the sub-table.
    const nested = document.querySelector('.fm-table__nested')
    expect(nested).toBeTruthy()
    expect(within(nested as HTMLElement).getByText('author')).toBeTruthy()
    expect(within(nested as HTMLElement).getByText('evan')).toBeTruthy()
    expect(within(nested as HTMLElement).getByText('version')).toBeTruthy()
    expect(within(nested as HTMLElement).getByText('0.1.0')).toBeTruthy()
  })

  it('falls back to JSON <pre> for nesting deeper than one level', () => {
    render(
      <FrontmatterTable
        data={{
          outer: {
            inner: {
              deeper: 'value',
            },
          },
        }}
      />,
    )

    // The depth-1 nested object shows up via sub-table; the depth-2 value
    // (`inner: { deeper: 'value' }`) must render as a <pre> JSON block.
    const pres = document.querySelectorAll('pre')
    expect(pres.length).toBeGreaterThan(0)
    const preText = Array.from(pres)
      .map((p) => p.textContent || '')
      .join('\n')
    expect(preText).toContain('deeper')
    expect(preText).toContain('value')
  })
})
