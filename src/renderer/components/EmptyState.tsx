type Props = {
  variant: 'no-sources' | 'no-matches'
}

export function EmptyState({ variant }: Props): JSX.Element {
  if (variant === 'no-matches') {
    return (
      <div className="empty-state">
        <div className="empty-state__icon" aria-hidden>
          ⌘
        </div>
        <div>No items match your filters.</div>
        <div style={{ fontSize: 11, color: 'var(--color-fg-subtle)' }}>
          Clear search or active chips to see the full list.
        </div>
      </div>
    )
  }
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden>
        ∅
      </div>
      <div>No sources detected.</div>
      <div style={{ fontSize: 11, color: 'var(--color-fg-subtle)' }}>
        Press ⌘R to rescan.
      </div>
    </div>
  )
}
