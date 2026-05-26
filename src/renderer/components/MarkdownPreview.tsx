import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  body: string
}

/**
 * Renders markdown body via react-markdown + remark-gfm.
 *
 * Sandboxed:
 *  - no raw HTML (default react-markdown behavior; no rehype-raw)
 *  - `javascript:` and `data:` URLs are stripped via `urlTransform`
 */
export function MarkdownPreview({ body }: Props): JSX.Element {
  if (!body.trim()) {
    return (
      <div
        className="markdown"
        style={{ color: 'var(--color-fg-muted)', fontStyle: 'italic' }}
      >
        (empty body)
      </div>
    )
  }
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={safeUrl}>
        {body}
      </ReactMarkdown>
    </div>
  )
}

function safeUrl(url: string): string {
  const lower = url.trim().toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
    return ''
  }
  return url
}
