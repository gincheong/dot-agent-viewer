import { useEffect } from 'react'

import { PluginList } from './PluginList'
import { ScanStaleLabel } from './ScanStaleLabel'
import { SearchBar } from './SearchBar'
import { SourceList } from './SourceList'
import { useAppStore } from '../store/useAppStore'

export function Sidebar(): JSX.Element {
  const loading = useAppStore((s) => s.loading)
  const empty = useAppStore((s) => s.sources.length === 0)
  const showShimmer = loading && empty
  const rescan = useAppStore((s) => s.rescan)
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const loadPlugins = useAppStore((s) => s.loadPlugins)
  const pluginsLoaded = useAppStore((s) => s.pluginsLoaded)

  useEffect(() => {
    if (activeTab === 'plugins' && !pluginsLoaded) {
      void loadPlugins()
    }
  }, [activeTab, pluginsLoaded, loadPlugins])

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
        <div className="sidebar__tabs">
          <button
            type="button"
            className="sidebar__tab"
            data-active={activeTab === 'sources'}
            onClick={() => setActiveTab('sources')}
          >
            Sources
          </button>
          <button
            type="button"
            className="sidebar__tab"
            data-active={activeTab === 'plugins'}
            onClick={() => setActiveTab('plugins')}
          >
            Plugins (Claude)
          </button>
        </div>
      </div>
      <div className="sidebar__scroll">
        {activeTab === 'sources' ? (
          showShimmer ? <ListShimmer /> : <SourceList />
        ) : (
          <PluginList />
        )}
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
