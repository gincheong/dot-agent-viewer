// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import type { ScanResult } from '../../../src/shared/types'
import {
  __mockSourcesForTests,
  useAppStore,
} from '../../../src/renderer/store/useAppStore'

describe('useAppStore', () => {
  // Snapshot the initial (empty) state, then re-seed each test with the
  // mock fixture so we exercise the store against realistic shapes.
  const initial = useAppStore.getState()
  beforeEach(() => {
    useAppStore.setState(
      {
        ...initial,
        sources: __mockSourcesForTests,
        selectedAbsPath: __mockSourcesForTests[0]?.absPath ?? null,
        scannedAt: Date.now(),
      },
      true,
    )
  })

  it('select() updates selectedAbsPath', () => {
    useAppStore.getState().select('/a/b/c.md')
    expect(useAppStore.getState().selectedAbsPath).toBe('/a/b/c.md')

    useAppStore.getState().select(null)
    expect(useAppStore.getState().selectedAbsPath).toBeNull()
  })

  it('setSearch() stores the query string', () => {
    useAppStore.getState().setSearch('make-pr')
    expect(useAppStore.getState().search).toBe('make-pr')
  })

  it('replaceAll() swaps sources, agents and scannedAt', () => {
    const newResult: ScanResult = {
      sources: [],
      agents: [{ name: 'Codex', path: '/Users/test/.codex' }],
      originalsRoot: '/Users/test/.agents',
      scannedAt: 12345,
      warnings: [],
    }
    useAppStore.getState().replaceAll(newResult)
    const state = useAppStore.getState()
    expect(state.sources).toEqual([])
    expect(state.agents).toEqual(newResult.agents)
    expect(state.scannedAt).toBe(12345)
  })
})
