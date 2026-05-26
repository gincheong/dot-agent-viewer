import { useCallback, useEffect, useRef, useState } from 'react'

import type { SourceItem } from '../../shared/types'

type Props = {
  item: SourceItem
}

type ActionId = 'open-editor' | 'copy-path' | 'copy-body'
type StatusKind = 'ok' | 'err'
type ActionStatus = { kind: StatusKind; message: string } | null

const STATUS_VISIBLE_MS = 1500

/**
 * Three actions for the selected item. Click handlers go through
 * `window.dotAgent.*` (real IPC) → `getHandlers()` in main → either the
 * default handlers (shell.openPath / clipboard.writeText / $EDITOR) or the
 * Playwright spies installed via `app.evaluate` from preload-spies.ts.
 *
 * Each button shows a transient inline status ("✓ copied" / "✗ failed") for
 * STATUS_VISIBLE_MS, surfaced to assistive tech via aria-live="polite".
 */
export function ActionBar({ item }: Props): JSX.Element {
  const [statusById, setStatusById] = useState<Record<ActionId, ActionStatus>>(
    {
      'open-editor': null,
      'copy-path': null,
      'copy-body': null,
    },
  )
  const timersRef = useRef<Partial<Record<ActionId, number>>>({})

  // Clear pending timers on unmount.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const id of Object.keys(timers) as ActionId[]) {
        const t = timers[id]
        if (t !== undefined) window.clearTimeout(t)
      }
    }
  }, [])

  // Reset status when the selected item changes so stale messages don't bleed
  // across selection changes.
  useEffect(() => {
    setStatusById({ 'open-editor': null, 'copy-path': null, 'copy-body': null })
  }, [item.absPath])

  const setStatus = useCallback(
    (id: ActionId, status: ActionStatus): void => {
      setStatusById((prev) => ({ ...prev, [id]: status }))
      const existing = timersRef.current[id]
      if (existing !== undefined) window.clearTimeout(existing)
      if (status !== null) {
        timersRef.current[id] = window.setTimeout(() => {
          setStatusById((prev) => ({ ...prev, [id]: null }))
        }, STATUS_VISIBLE_MS)
      }
    },
    [],
  )

  const runAction = useCallback(
    async (id: ActionId): Promise<void> => {
      const bridge =
        typeof window !== 'undefined' ? window.dotAgent : undefined
      if (!bridge) {
        setStatus(id, { kind: 'err', message: '✗ bridge unavailable' })
        return
      }
      try {
        const result =
          id === 'open-editor'
            ? await bridge.openEditor(item.absPath)
            : id === 'copy-path'
              ? await bridge.copyPath(item.absPath)
              : await bridge.copyBody(item.bodyMarkdown)
        if (result.ok) {
          setStatus(id, { kind: 'ok', message: successMessage(id) })
        } else {
          setStatus(id, {
            kind: 'err',
            message: `✗ ${'reason' in result ? result.reason : 'failed'}`,
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setStatus(id, { kind: 'err', message: `✗ ${message}` })
      }
    },
    [item.absPath, item.bodyMarkdown, setStatus],
  )

  return (
    <div className="action-bar" role="toolbar" aria-label="Item actions">
      <ActionButton
        label="Open in editor"
        status={statusById['open-editor']}
        onClick={() => void runAction('open-editor')}
      />
      <ActionButton
        label="Copy path"
        status={statusById['copy-path']}
        onClick={() => void runAction('copy-path')}
      />
      <ActionButton
        label="Copy body"
        status={statusById['copy-body']}
        onClick={() => void runAction('copy-body')}
      />
    </div>
  )
}

function ActionButton({
  label,
  status,
  onClick,
}: {
  label: string
  status: ActionStatus
  onClick: () => void
}): JSX.Element {
  return (
    <div className="action-button-wrap">
      <button type="button" className="action-button" onClick={onClick}>
        {label}
      </button>
      <span
        className="action-status"
        data-kind={status?.kind ?? ''}
        aria-live="polite"
      >
        {status?.message ?? ''}
      </span>
    </div>
  )
}

function successMessage(id: ActionId): string {
  if (id === 'open-editor') return '✓ opened'
  return '✓ copied'
}
