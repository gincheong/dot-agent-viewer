import Fuse from 'fuse.js'
import { useMemo } from 'react'

import type { SourceItem } from '../../shared/types'

// fuse.js index options per plan §5.
// Keys are weighted: name dominates, then description.oneLine, then the
// raw frontmatter.description (only when it is a string). `threshold: 0.35`
// keeps results tight; `ignoreLocation: true` makes match position irrelevant
// (the name is often short, so location-anchored matching would score badly).
const FUSE_OPTIONS: ConstructorParameters<typeof Fuse<SourceItem>>[1] = {
  threshold: 0.35,
  ignoreLocation: true,
  useExtendedSearch: false,
  includeScore: false,
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'description.oneLine', weight: 0.3 },
    {
      name: 'frontmatter.description',
      weight: 0.2,
      // Only fold this in when it's a string. Block-scalar / object / array
      // shapes would either produce noisy fuzzy matches or throw in Fuse's
      // default getter — gate via a custom getFn.
      getFn: (item) => {
        const raw = (item.frontmatter as Record<string, unknown>)?.description
        return typeof raw === 'string' ? raw : ''
      },
    },
  ],
}

/**
 * Memoized fuzzy search over the source list. Empty queries short-circuit
 * and return the input array as-is (no Fuse construction cost). The Fuse
 * instance is recomputed whenever `items` identity changes — callers should
 * keep `items` stable across renders (the Zustand selector does this).
 */
export function useFuse(items: SourceItem[], query: string): SourceItem[] {
  const fuse = useMemo(() => new Fuse(items, FUSE_OPTIONS), [items])

  return useMemo(() => {
    const q = query.trim()
    if (!q) return items
    return fuse.search(q).map((result) => result.item)
  }, [fuse, items, query])
}
