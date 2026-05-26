import { useEffect } from 'react'

import { DetailPane } from './components/DetailPane'
import { Sidebar } from './components/Sidebar'
import { useAppearance } from './hooks/useAppearance'

export default function App(): JSX.Element {
  useAppearance()

  // ⌘R is a passive placeholder in Phase C — Phase E wires real rescan.
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
