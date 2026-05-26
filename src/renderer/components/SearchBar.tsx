import { useEffect, useState } from 'react'

import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useAppStore } from '../store/useAppStore'

const DEBOUNCE_MS = 100

/**
 * Search input: controlled by a local state to keep the input snappy on every
 * keystroke, but writes to `store.search` only after a 100ms debounce so
 * Fuse/filter recomputes don't run on every character (plan §5).
 */
export function SearchBar(): JSX.Element {
  const storeSearch = useAppStore((s) => s.search)
  const setSearch = useAppStore((s) => s.setSearch)

  const [local, setLocal] = useState(storeSearch)
  const debounced = useDebouncedValue(local, DEBOUNCE_MS)

  useEffect(() => {
    if (debounced !== storeSearch) {
      setSearch(debounced)
    }
    // We intentionally do NOT depend on storeSearch — this effect is one-way
    // (local → store). External resets to the store would loop without this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, setSearch])

  return (
    <label className="search-bar">
      <input
        type="search"
        className="search-bar__input"
        placeholder="Search by name or description"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
    </label>
  )
}
