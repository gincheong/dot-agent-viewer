import { FilterChips } from './FilterChips'
import { ScanStaleLabel } from './ScanStaleLabel'
import { SearchBar } from './SearchBar'
import { SourceList } from './SourceList'

/**
 * Left pane: top bar (stale label + refresh button) + search + filter chips +
 * source list. ⌘R wiring lives in App; the RefreshButton here is a passive
 * placeholder that Phase E will wire to `window.dotAgent.rescan()`.
 */
export function Sidebar(): JSX.Element {
  return (
    <aside className="sidebar" aria-label="Source list">
      <div className="sidebar__topbar">
        <div className="sidebar__topbar-row">
          <ScanStaleLabel />
          <button
            type="button"
            className="refresh-button"
            title="Refresh (⌘R)"
            onClick={() => console.log('[stub] rescan')}
          >
            ↻ Refresh
          </button>
        </div>
        <SearchBar />
        <FilterChips />
      </div>
      <div className="sidebar__scroll">
        <SourceList />
      </div>
    </aside>
  )
}
