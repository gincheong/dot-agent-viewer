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
  // injected onto window) once on mount. Subsequent rescans (⌘R, Refresh)
  // do NOT block the UI — just update once data arrives.
  useEffect(() => {
    if (!hasLoaded) {
      void rescan()
    }
    // mount-only — rescan and hasLoaded read via store getter on each call,
    // so they don't need to be in deps.
  }, [])

  // ⌘R is dispatched by the main-process menu accelerator
  // (see src/main/index.ts → "View → Refresh"). The renderer subscribes via
  // the preload bridge and calls rescan from the latest store snapshot.
  useEffect(() => {
    const bridge = typeof window !== 'undefined' ? window.dotAgent : undefined
    if (!bridge) return
    const unsubscribe = bridge.onRescanRequest(() => {
      void useAppStore.getState().rescan()
    })
    return unsubscribe
  }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <DetailPane />
    </div>
  )
}
