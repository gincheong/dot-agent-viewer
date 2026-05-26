import { useEffect, useState } from 'react'

export type ScanStaleness = {
  label: string
  isStale: boolean
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Returns a human-readable "last scanned" label that updates every minute.
 * `isStale` flips true when the last scan is older than the stale threshold.
 *
 * Pure formatter — no IPC. Phase D feeds `scannedAt` from store.
 */
export function useScanStaleness(
  scannedAt: number | null,
  staleAfterMs: number = MINUTE,
): ScanStaleness {
  // tick state forces a re-render every minute so the label refreshes
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), MINUTE)
    return () => window.clearInterval(id)
  }, [])

  if (scannedAt == null) {
    return { label: 'Last scan failed — press ⌘R', isStale: true }
  }

  const ageMs = Date.now() - scannedAt
  const isStale = ageMs > staleAfterMs
  return { label: formatLabel(ageMs), isStale }
}

function formatLabel(ageMs: number): string {
  if (ageMs < MINUTE) return 'Last scanned: just now'
  if (ageMs < HOUR) {
    const m = Math.floor(ageMs / MINUTE)
    return `Last scanned: ${m}m ago`
  }
  if (ageMs < DAY) {
    const h = Math.floor(ageMs / HOUR)
    return `Last scanned: ${h}h ago`
  }
  const d = Math.floor(ageMs / DAY)
  return `Last scanned: ${d}d ago`
}
