import { ScanStaleLabel } from './ScanStaleLabel'
import { SearchBar } from './SearchBar'
import { SourceList } from './SourceList'
import { useAppStore } from '../store/useAppStore'

/**
 * Left pane: top bar (stale label + refresh button) + search + source list.
 * ⌘R wiring lives in App; the RefreshButton here is a passive placeholder
 * that Phase E will wire to `window.dotAgent.rescan()`.
 */
export function Sidebar(): JSX.Element {
  const loading = useAppStore((s) => s.loading)
  const empty = useAppStore((s) => s.sources.length === 0)
  const showShimmer = loading && empty
  const rescan = useAppStore((s) => s.rescan)

  return (
    <aside className="sidebar" aria-label="Source list">
      <div className="sidebar__topbar">
        <div className="sidebar__topbar-row">
          <ScanStaleLabel />
          <button
            type="button"
            className="refresh-button"
            title="Refresh (⌘R)"
            onClick={() => void rescan()}
          >
            ↻ Refresh
          </button>
        </div>
        <SearchBar />
      </div>
      <div className="sidebar__scroll">
        {showShimmer ? <ListShimmer /> : <SourceList />}
      </div>
    </aside>
  )
}

function ListShimmer(): JSX.Element {
  return (
    <div className="list-shimmer" aria-busy="true" aria-live="polite">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="list-shimmer__row" />
      ))}
    </div>
  )
}
