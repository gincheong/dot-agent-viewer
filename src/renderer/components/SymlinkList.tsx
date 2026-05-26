import { AgentBadge } from './AgentBadge'
import type { SourceItem, SymlinkRef } from '../../shared/types'

type Props = {
  item: SourceItem
}

/**
 * Renders the symlink references that point at the selected item, grouped by
 * `agentRoot.name`.
 *
 * For `external-link` provenance, renders a single synthetic row showing the
 * external target path (the link itself is `absPath`).
 * For `agent-local`, the section is hidden by the parent (no inbound links).
 */
export function SymlinkList({ item }: Props): JSX.Element | null {
  if (item.provenance === 'agent-local') return null

  if (item.provenance === 'external-link') {
    return (
      <div className="symlink-group">
        <div className="symlink-row">
          <span className="symlink-row__path">{item.absPath}</span>
          <span>→</span>
          <span className="symlink-row__path">
            {item.externalTargetPath ?? '(unknown target)'}
          </span>
          {item.ownerAgentRoot && <AgentBadge agentRoot={item.ownerAgentRoot} />}
        </div>
      </div>
    )
  }

  const refs = item.symlinks
  if (refs.length === 0) {
    return (
      <div
        style={{
          color: 'var(--color-fg-muted)',
          fontStyle: 'italic',
          fontSize: 'var(--fs-13)',
        }}
      >
        (no agent root exposes this item)
      </div>
    )
  }

  const grouped = groupBy(refs, (r) => r.agentRoot.name)
  const groups = Object.keys(grouped).sort((a, b) => a.localeCompare(b))

  return (
    <>
      {groups.map((name) => {
        const list = grouped[name]
        const agent = list[0].agentRoot
        return (
          <div key={name} className="symlink-group">
            <div className="symlink-group__title">
              <AgentBadge agentRoot={agent} />
              <span>{list.length} reference{list.length === 1 ? '' : 's'}</span>
            </div>
            {list
              .slice()
              .sort((a, b) => a.linkPath.localeCompare(b.linkPath))
              .map((symlink) => (
                <SymlinkRow key={symlink.linkPath} symlink={symlink} />
              ))}
          </div>
        )
      })}
    </>
  )
}

function SymlinkRow({ symlink }: { symlink: SymlinkRef }): JSX.Element {
  return (
    <div
      className="symlink-row"
      data-broken={symlink.broken ? 'true' : 'false'}
    >
      <span className="symlink-row__path">{symlink.linkPath}</span>
      {symlink.broken && (
        <span className="pill" data-tone="danger">
          broken
        </span>
      )}
    </div>
  )
}

function groupBy<T, K extends string>(
  arr: T[],
  keyFn: (t: T) => K,
): Record<K, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = keyFn(item)
      ;(acc[k] ||= []).push(item)
      return acc
    },
    {} as Record<K, T[]>,
  )
}
