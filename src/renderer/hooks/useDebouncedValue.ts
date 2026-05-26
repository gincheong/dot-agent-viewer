import { useEffect, useState } from 'react'

/**
 * Returns `value` delayed by `delayMs`. Used to keep the source-list filter
 * from rerunning Fuse on every keystroke against long lists (plan §5 NFR:
 * search response < 100ms even on >1000-item lists).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
