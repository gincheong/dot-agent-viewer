import { useMemo } from 'react'

import { useAppStore } from '../store/useAppStore'
import type { SourceItem } from '../../shared/types'

const SHORT_SCALAR_MAX = 64
const COMMA_LIST_CAP = 10

type ChipCandidate = { key: string; value: string }

/**
 * Generates filter-chip candidates from the union of all frontmatter values
 * across `sources`, per plan §5:
 *  1. short scalar string (≤64 chars) → chip `key:value`
 *  2. array of ≤10 short strings → chip per element
 *  3. comma-separated string of ≤10 tokens → chip per token
 *  Anything else → no chip (table-only).
 *
 * Phase D will wire actual filtering of the source list against active chips.
 */
export function FilterChips(): JSX.Element | null {
  const sources = useAppStore((s) => s.sources)
  const filterChips = useAppStore((s) => s.filterChips)
  const toggleChip = useAppStore((s) => s.toggleChip)

  const candidates = useMemo(() => buildCandidates(sources), [sources])

  if (candidates.length === 0) return null

  return (
    <div className="filter-chips" role="list">
      {candidates.map((c) => {
        const id = `${c.key}:${c.value}`
        const active = filterChips.some(
          (f) => f.key === c.key && f.value === c.value,
        )
        return (
          <button
            key={id}
            type="button"
            className="filter-chip"
            data-active={active ? 'true' : 'false'}
            onClick={() => toggleChip(c.key, c.value)}
            role="listitem"
          >
            <span>{c.key}:</span>
            <strong style={{ fontWeight: 600 }}>{c.value}</strong>
          </button>
        )
      })}
    </div>
  )
}

export function buildCandidates(sources: SourceItem[]): ChipCandidate[] {
  const set = new Set<string>()
  const out: ChipCandidate[] = []

  for (const src of sources) {
    const fm = src.frontmatter
    for (const [key, value] of Object.entries(fm)) {
      for (const chip of chipsFor(key, value)) {
        const id = `${chip.key}:${chip.value}`
        if (set.has(id)) continue
        set.add(id)
        out.push(chip)
      }
    }
  }
  // stable sort: key, then value
  out.sort((a, b) => a.key.localeCompare(b.key) || a.value.localeCompare(b.value))
  return out
}

function chipsFor(key: string, value: unknown): ChipCandidate[] {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    // comma-list with ≤10 tokens → chip per token
    if (trimmed.includes(',')) {
      const tokens = trimmed
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length <= SHORT_SCALAR_MAX)
      if (tokens.length > 0 && tokens.length <= COMMA_LIST_CAP) {
        return tokens.map((t) => ({ key, value: t }))
      }
      return [] // >10 tokens → table-only fallback
    }
    if (trimmed.length <= SHORT_SCALAR_MAX) {
      return [{ key, value: trimmed }]
    }
    return []
  }
  if (Array.isArray(value)) {
    if (value.length > COMMA_LIST_CAP) return []
    const out: ChipCandidate[] = []
    for (const el of value) {
      if (typeof el !== 'string') return [] // mixed/object array → reject
      const t = el.trim()
      if (!t || t.length > SHORT_SCALAR_MAX) return []
      out.push({ key, value: t })
    }
    return out
  }
  // numbers / booleans / nested objects → not chip-source candidates
  return []
}
