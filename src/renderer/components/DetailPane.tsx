import { useAppStore } from '../store/useAppStore'
import { ActionBar } from './ActionBar'
import { FrontmatterTable } from './FrontmatterTable'
import { MarkdownPreview } from './MarkdownPreview'
import { SymlinkList } from './SymlinkList'
import type { Provenance, SourceItem } from '../../shared/types'

const PROVENANCE_LABEL: Record<Provenance, string> = {
  'agents-hub': 'hub original',
  'agent-local': 'agent-local',
  'external-link': 'external link',
}

export function DetailPane(): JSX.Element {
  const selectedAbsPath = useAppStore((s) => s.selectedAbsPath)
  const item = useAppStore((s) =>
    selectedAbsPath
      ? s.sources.find((src) => src.absPath === selectedAbsPath) ?? null
      : null,
  )

  if (!item) {
    return (
      <div className="detail-pane">
        <div className="detail-pane__empty">
          Select an item to see its details.
        </div>
      </div>
    )
  }

  return (
    <div className="detail-pane">
      <div className="detail-pane__scroll">
        <Header item={item} />
        <ActionBar item={item} />

        <section className="section">
          <h3 className="section__title">Frontmatter</h3>
          <FrontmatterTable data={item.frontmatter} />
        </section>

        {item.provenance !== 'agent-local' && (
          <section className="section">
            <h3 className="section__title">Symlinks</h3>
            <SymlinkList item={item} />
          </section>
        )}

        <section className="section">
          <h3 className="section__title">Body</h3>
          <MarkdownPreview body={item.bodyMarkdown} />
        </section>
      </div>
    </div>
  )
}

function Header({ item }: { item: SourceItem }): JSX.Element {
  const provenanceTone =
    item.provenance === 'agents-hub'
      ? 'accent'
      : item.provenance === 'external-link'
      ? 'warn'
      : undefined
  return (
    <div className="detail-header">
      <div className="detail-header__title-row">
        <h1 className="detail-header__title">{item.name}</h1>
        <span className="pill">{item.kind}</span>
        <span className="pill" data-tone={provenanceTone}>
          {PROVENANCE_LABEL[item.provenance]}
        </span>
        {item.frontmatterStatus !== 'present' && (
          <span className="pill" data-tone="warn">
            frontmatter {item.frontmatterStatus}
          </span>
        )}
      </div>
      <div className="detail-header__path">{item.absPath}</div>
    </div>
  )
}
