import { useState } from 'react'

type Props = {
  data: Record<string, unknown>
}

const LONG_STRING_THRESHOLD = 200
const COMMA_LIST_TOKEN_CAP = 10

/**
 * Sorted key/value table for frontmatter. Per plan §5:
 *  - plain scalar (≤200 chars) → inline text row
 *  - long scalar OR comma-list with >10 tokens → "Show full" toggle (collapsed)
 *  - array of scalars → comma-joined inline
 *  - plain object → depth-1 nested sub-table
 *  - array of objects OR deeper-than-1 nesting → JSON `<pre>` fallback
 *  - boolean / number / null → monospace literal
 */
export function FrontmatterTable({ data }: Props): JSX.Element {
  const keys = Object.keys(data).sort((a, b) => a.localeCompare(b))

  if (keys.length === 0) {
    return (
      <div
        style={{
          color: 'var(--color-fg-muted)',
          fontStyle: 'italic',
          fontSize: 'var(--fs-13)',
        }}
      >
        (no frontmatter)
      </div>
    )
  }

  return (
    <div className="fm-table" role="table">
      {keys.map((k) => (
        <Row key={k} k={k} v={data[k]} />
      ))}
    </div>
  )
}

function Row({ k, v }: { k: string; v: unknown }): JSX.Element {
  return (
    <div className="fm-table__row" role="row">
      <div className="fm-table__key" role="cell">
        {k}
      </div>
      <div className="fm-table__value" role="cell">
        <ValueRenderer value={v} depth={0} />
      </div>
    </div>
  )
}

function ValueRenderer({
  value,
  depth,
}: {
  value: unknown
  depth: number
}): JSX.Element {
  if (value === null) {
    return <code>null</code>
  }
  if (value === undefined) {
    return <code>undefined</code>
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return <code>{String(value)}</code>
  }
  if (value instanceof Date) {
    return <span>{value.toISOString()}</span>
  }
  if (typeof value === 'string') {
    return <StringValue value={value} />
  }
  if (Array.isArray(value)) {
    if (value.every(isScalar)) {
      return <span>{value.map(String).join(', ')}</span>
    }
    // Array of objects (or mixed) → JSON fallback (no recursion into items).
    return (
      <pre>
        <code>{safeStringify(value)}</code>
      </pre>
    )
  }
  if (typeof value === 'object') {
    // Plain object — exactly one level of recursion allowed (depth-cap = 1).
    if (depth >= 1) {
      return (
        <pre>
          <code>{safeStringify(value)}</code>
        </pre>
      )
    }
    return <NestedObject value={value as Record<string, unknown>} />
  }
  // Fallback for anything exotic (e.g. functions in mock data).
  return <code>{String(value)}</code>
}

function StringValue({ value }: { value: string }): JSX.Element {
  const tokens = value.includes(',')
    ? value.split(',').map((s) => s.trim()).filter(Boolean)
    : null
  const isCommaList = tokens != null && tokens.length > 1
  const isLong = value.length > LONG_STRING_THRESHOLD
  const exceedsCommaCap = isCommaList && tokens!.length > COMMA_LIST_TOKEN_CAP
  const collapsed = isLong || exceedsCommaCap
  const [expanded, setExpanded] = useState(false)

  if (!collapsed) {
    return <span>{value}</span>
  }

  if (!expanded) {
    const preview = isLong
      ? value.slice(0, 137).trimEnd() + '…'
      : tokens!.slice(0, 3).join(', ') + `, … (${tokens!.length} items)`
    return (
      <>
        <span>{preview}</span>
        <button
          type="button"
          className="fm-table__toggle"
          onClick={() => setExpanded(true)}
        >
          Show full
        </button>
      </>
    )
  }
  return (
    <>
      <span style={{ whiteSpace: 'pre-wrap' }}>{value}</span>
      <button
        type="button"
        className="fm-table__toggle"
        onClick={() => setExpanded(false)}
      >
        Show less
      </button>
    </>
  )
}

function NestedObject({
  value,
}: {
  value: Record<string, unknown>
}): JSX.Element {
  const keys = Object.keys(value).sort((a, b) => a.localeCompare(b))
  if (keys.length === 0) {
    return <code>{'{}'}</code>
  }
  return (
    <div className="fm-table__nested" role="table">
      {keys.map((k) => (
        <div key={k} className="fm-table__nested-row" role="row">
          <div className="fm-table__nested-key" role="cell">
            {k}
          </div>
          <div className="fm-table__nested-value" role="cell">
            <ValueRenderer value={value[k]} depth={1} />
          </div>
        </div>
      ))}
    </div>
  )
}

function isScalar(x: unknown): boolean {
  return (
    x === null ||
    typeof x === 'string' ||
    typeof x === 'number' ||
    typeof x === 'boolean'
  )
}

function safeStringify(x: unknown): string {
  try {
    return JSON.stringify(x, null, 2)
  } catch {
    return String(x)
  }
}
