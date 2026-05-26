// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import type { ScanResult } from '../../../src/shared/types'
import { useAppStore } from '../../../src/renderer/store/useAppStore'

describe('useAppStore', () => {
  // Snapshot the initial state once so each test can re-seed deterministically.
  const initial = useAppStore.getState()
  beforeEach(() => {
    useAppStore.setState(initial, true)
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

  it('toggleChip() adds a chip on first call and removes it on the second', () => {
    const { toggleChip } = useAppStore.getState()
    toggleChip('model', 'opus')
    expect(useAppStore.getState().filterChips).toEqual([
      { key: 'model', value: 'opus' },
    ])

    toggleChip('model', 'opus')
    expect(useAppStore.getState().filterChips).toEqual([])
  })

  it('toggleChip() accumulates distinct chips', () => {
    const { toggleChip } = useAppStore.getState()
    toggleChip('model', 'opus')
    toggleChip('allowed-tools', 'Bash')
    expect(useAppStore.getState().filterChips).toEqual([
      { key: 'model', value: 'opus' },
      { key: 'allowed-tools', value: 'Bash' },
    ])
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
