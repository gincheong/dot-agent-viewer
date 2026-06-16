import { useAppStore } from '../store/useAppStore'
import { ActionBar } from './ActionBar'
import { FrontmatterTable } from './FrontmatterTable'
import { MarkdownPreview } from './MarkdownPreview'

export function PluginDetailPane(): JSX.Element {
  const item = useAppStore((s) => s.selectedPluginItem)

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
        <div className="detail-header">
          <div className="detail-header__title-row">
            <h1 className="detail-header__title">{item.name}</h1>
            <span className="pill">{item.kind}</span>
            <span className="pill">plugin</span>
            {item.frontmatterStatus !== 'present' && (
              <span className="pill" data-tone="warn">
                frontmatter {item.frontmatterStatus}
              </span>
            )}
          </div>
          <div className="detail-header__path">{item.absPath}</div>
          <div className="detail-header__plugin-id">
            from <code>{item.pluginId}</code>
          </div>
        </div>

        <ActionBar
          item={{
            kind: item.kind,
            provenance: 'agent-local',
            name: item.name,
            absPath: item.absPath,
            frontmatter: item.frontmatter,
            frontmatterStatus: item.frontmatterStatus,
            bodyMarkdown: item.bodyMarkdown,
            description: item.description,
            symlinks: [],
          }}
        />

        <section className="section">
          <h3 className="section__title">Frontmatter</h3>
          <FrontmatterTable data={item.frontmatter} />
        </section>

        <section className="section">
          <h3 className="section__title">Body</h3>
          <MarkdownPreview body={item.bodyMarkdown} />
        </section>
      </div>
    </div>
  )
}
