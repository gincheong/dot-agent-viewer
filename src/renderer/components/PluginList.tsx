import { useState } from 'react'

import type { PluginEntry, PluginItem } from '../../shared/types'
import { useAppStore } from '../store/useAppStore'

export function PluginList(): JSX.Element {
  const plugins = useAppStore((s) => s.plugins)
  const pluginsLoading = useAppStore((s) => s.pluginsLoading)
  const pluginsLoaded = useAppStore((s) => s.pluginsLoaded)

  if (pluginsLoading) {
    return (
      <div className="plugin-loading">
        Loading plugins…
      </div>
    )
  }

  if (pluginsLoaded && plugins.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">🔌</div>
        <div>No Claude plugins installed.</div>
      </div>
    )
  }

  return (
    <>
      {plugins.map((plugin) => (
        <PluginGroup key={`${plugin.id}:${plugin.installPath}`} plugin={plugin} />
      ))}
    </>
  )
}

function PluginGroup({ plugin }: { plugin: PluginEntry }): JSX.Element {
  const [expanded, setExpanded] = useState(true)
  const selectedPluginItem = useAppStore((s) => s.selectedPluginItem)
  const selectPluginItem = useAppStore((s) => s.selectPluginItem)

  const commands = plugin.items.filter((i) => i.kind === 'command')
  const skills = plugin.items.filter((i) => i.kind === 'skill')

  const scopeLabel =
    plugin.scope === 'project' && plugin.projectPath
      ? `project: ${plugin.projectPath.split('/').pop()}`
      : plugin.scope

  return (
    <div className="plugin-group">
      <button
        type="button"
        className="plugin-group__header"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="plugin-group__chevron">{expanded ? '▾' : '▸'}</span>
        <span className="plugin-group__name">{plugin.name}</span>
        <span className="plugin-group__meta">
          <span className="plugin-group__marketplace">{plugin.marketplace}</span>
          <span className="plugin-group__version">v{plugin.version}</span>
          <span className="plugin-group__scope">{scopeLabel}</span>
        </span>
        <span className="plugin-group__count">{plugin.items.length}</span>
      </button>

      {expanded && plugin.items.length > 0 && (
        <div className="plugin-group__items">
          {commands.length > 0 && (
            <div className="plugin-items-section">
              <div className="plugin-items-section__label">commands</div>
              {commands.map((item) => (
                <PluginItemRow
                  key={item.absPath}
                  item={item}
                  selected={selectedPluginItem?.absPath === item.absPath}
                  onSelect={() => selectPluginItem(item)}
                />
              ))}
            </div>
          )}
          {skills.length > 0 && (
            <div className="plugin-items-section">
              <div className="plugin-items-section__label">skills</div>
              {skills.map((item) => (
                <PluginItemRow
                  key={item.absPath}
                  item={item}
                  selected={selectedPluginItem?.absPath === item.absPath}
                  onSelect={() => selectPluginItem(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {expanded && plugin.items.length === 0 && (
        <div className="plugin-group__empty">No commands or skills</div>
      )}
    </div>
  )
}

function PluginItemRow({
  item,
  selected,
  onSelect,
}: {
  item: PluginItem
  selected: boolean
  onSelect: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      className="plugin-item"
      data-selected={selected}
      onClick={onSelect}
    >
      <div className="plugin-item__row">
        <span className="plugin-item__name">{item.name}</span>
      </div>
      {item.description && (
        <div className="plugin-item__desc">{item.description.oneLine}</div>
      )}
    </button>
  )
}
