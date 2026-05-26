import type { SourceItem } from '../../shared/types'

type Props = {
  item: SourceItem
}

/**
 * Three actions for the selected item. Click handlers are stubbed for Phase C;
 * Phase E replaces them with real IPC calls to `action:open-editor`,
 * `action:copy-path`, `action:copy-body`.
 */
export function ActionBar({ item }: Props): JSX.Element {
  return (
    <div className="action-bar" role="toolbar" aria-label="Item actions">
      <button
        type="button"
        className="action-button"
        onClick={() => console.log('[stub] open-editor', item.absPath)}
      >
        Open in editor
      </button>
      <button
        type="button"
        className="action-button"
        onClick={() => console.log('[stub] copy-path', item.absPath)}
      >
        Copy path
      </button>
      <button
        type="button"
        className="action-button"
        onClick={() =>
          console.log('[stub] copy-body', item.bodyMarkdown.length, 'chars')
        }
      >
        Copy body
      </button>
    </div>
  )
}
