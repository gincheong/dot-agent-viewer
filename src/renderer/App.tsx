import { useEffect } from 'react'

import { DetailPane } from './components/DetailPane'
import { Sidebar } from './components/Sidebar'
import { useAppearance } from './hooks/useAppearance'
import { useAppStore } from './store/useAppStore'

export default function App(): JSX.Element {
  useAppearance()

  const rescan = useAppStore((s) => s.rescan)
  const hasLoaded = useAppStore((s) => s.scannedAt !== null)

  // Boot scan: pull real data via IPC (or the Playwright test-result fixture
  // injected onto window) once on mount. Subsequent rescans (⌘R, Phase E)
  // do NOT block the UI — just update once data arrives.
  useEffect(() => {
    if (!hasLoaded) {
      void rescan()
    }
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ⌘R is a passive placeholder in Phase D — Phase E wires real rescan via
  // an Accelerator + visible Refresh button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        console.log('[stub] ⌘R rescan — wired in Phase E')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <DetailPane />
    </div>
  )
}
