import { useAppStore } from '../store/useAppStore'
import { AgentBadge } from './AgentBadge'
import type { AgentRoot, SourceItem } from '../../shared/types'

type Props = {
  item: SourceItem
}

export function SourceListItem({ item }: Props): JSX.Element {
  const selected = useAppStore((s) => s.selectedAbsPath === item.absPath)
  const select = useAppStore((s) => s.select)
  const badges = uniqueAgentRoots(item)

  return (
    <button
      type="button"
      className="source-item"
      data-selected={selected ? 'true' : 'false'}
      onClick={() => select(item.absPath)}
    >
      <div className="source-item__row">
        <span className="source-item__name">{item.name}</span>
        <span className="source-item__badges">
          {badges.map((r) => (
            <AgentBadge key={r.name} agentRoot={r} />
          ))}
        </span>
      </div>
      {item.description?.oneLine && (
        <div className="source-item__desc">{item.description.oneLine}</div>
      )}
      {item.provenance === 'external-link' && item.externalTargetPath && (
        <div className="source-item__subtitle">
          → {item.externalTargetPath}
        </div>
      )}
    </button>
  )
}

function uniqueAgentRoots(item: SourceItem): AgentRoot[] {
  // For hub items: dedupe the symlinks by agent name.
  // For agent-local / external-link: render the owner badge alone.
  if (item.provenance === 'agents-hub') {
    const seen = new Map<string, AgentRoot>()
    for (const sym of item.symlinks) {
      if (!seen.has(sym.agentRoot.name)) {
        seen.set(sym.agentRoot.name, sym.agentRoot)
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  }
  return item.ownerAgentRoot ? [item.ownerAgentRoot] : []
}
