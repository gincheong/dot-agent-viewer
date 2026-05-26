import { useAppStore } from '../store/useAppStore'
import { useScanStaleness } from '../hooks/useScanStaleness'

export function ScanStaleLabel(): JSX.Element {
  const scannedAt = useAppStore((s) => s.scannedAt)
  const { label, isStale } = useScanStaleness(scannedAt)

  return (
    <div className="scan-stale">
      <span>{label}</span>
      {isStale && scannedAt != null && (
        <span className="scan-stale__pill" aria-label="scan is stale">
          stale
        </span>
      )}
    </div>
  )
}
