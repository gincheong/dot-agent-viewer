import { useFuse } from '../hooks/useFuse'
import { useAppStore } from '../store/useAppStore'
import { EmptyState } from './EmptyState'
import { SourceListItem } from './SourceListItem'
import type { Provenance, SourceItem } from '../../shared/types'

type Group = {
  id: Provenance
  title: string
  items: SourceItem[]
}

const GROUP_ORDER: Provenance[] = ['agents-hub', 'external-link']
const GROUP_TITLES: Record<Provenance, string> = {
  'agents-hub': 'Hub originals',
  'agent-local': 'Agent-local files',
  'external-link': 'External links',
}

export function SourceList(): JSX.Element {
  const allSources = useAppStore((s) => s.sources)
  const search = useAppStore((s) => s.search)

  const sources = allSources.filter((s) => s.provenance !== 'agent-local')
  const filtered = useFuse(sources, search)

  if (sources.length === 0) {
    return <EmptyState variant="no-sources" />
  }

  if (filtered.length === 0) {
    return <EmptyState variant="no-matches" />
  }

  const groups: Group[] = GROUP_ORDER.map((id) => ({
    id,
    title: GROUP_TITLES[id],
    items: filtered
      .filter((s) => s.provenance === id)
      .sort((a, b) =>
        a.kind === b.kind
          ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          : a.kind.localeCompare(b.kind),
      ),
  })).filter((g) => g.items.length > 0)

  if (groups.length === 0) {
    return <EmptyState variant="no-matches" />
  }

  return (
    <>
      {groups.map((g) => (
        <div key={g.id} className="list-group">
          <div className="list-group__header">
            <span>{g.title}</span>
            <span className="list-group__count">{g.items.length}</span>
          </div>
          {g.items.map((item) => (
            <SourceListItem key={item.absPath} item={item} />
          ))}
        </div>
      ))}
    </>
  )
}
