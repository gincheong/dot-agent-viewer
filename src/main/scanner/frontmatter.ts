// gray-matter wrapper with safe-fail + Description normalization.
// See plan §4 Phase 3.

import { promises as fs } from 'fs'
import matter from 'gray-matter'
import yaml from 'js-yaml'

import type { Description, FrontmatterStatus } from '../../shared/types'

/**
 * Safe gray-matter options.
 *
 * IMPORTANT (security): gray-matter v4 ships an `engines.javascript` parser
 * that calls `eval()` on the frontmatter body when the file's first line is
 * `---javascript`. We pin `language: 'yaml'` AND override the engines map so
 * only the YAML engine (powered by js-yaml's default schema, which has no
 * eval / code-execution support) is ever invoked. A hostile `.md` containing
 * a `---javascript` block now parses through the yaml engine and either
 * succeeds (returning data) or fails (returning malformed status). It can
 * never reach `eval`.
 */
const SAFE_MATTER_OPTS = {
  language: 'yaml',
  engines: {
    yaml: {
      parse: (s: string): object => (yaml.load(s) as object) ?? {},
      stringify: (o: object): string => yaml.dump(o),
    },
  },
} as const

export type ParsedFrontmatter = {
  frontmatter: Record<string, unknown>
  frontmatterStatus: FrontmatterStatus
  bodyMarkdown: string
  description?: Description
  error?: string
}

const MAX_DESCRIPTION_LEN = 140
const DESCRIPTION_SLICE_FOR_TRUNCATE = MAX_DESCRIPTION_LEN - 3 // room for '…' + safety

/**
 * Normalize a frontmatter `description` value into a one-line string.
 *
 * Handles:
 *   - string (incl. YAML block scalars with embedded newlines)
 *   - arrays (joined with ", ")
 *   - other objects (JSON.stringify fallback)
 *
 * Truncation walks back to a word boundary to avoid cutting mid-word.
 */
export function normalizeDescription(raw: unknown): Description | undefined {
  if (raw == null) return undefined
  let s: string
  if (typeof raw === 'string') s = raw
  else if (Array.isArray(raw)) s = raw.map((v) => String(v)).join(', ')
  else s = JSON.stringify(raw)

  const collapsed = s.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= MAX_DESCRIPTION_LEN) {
    return { raw, oneLine: collapsed }
  }

  // Word-boundary back-walk: prefer cutting at the last whitespace within
  // the first DESCRIPTION_SLICE_FOR_TRUNCATE chars.
  let cut = collapsed.slice(0, DESCRIPTION_SLICE_FOR_TRUNCATE)
  // If the next char is not whitespace, walk back to the last whitespace
  // to avoid mid-word truncation.
  const nextChar = collapsed.charAt(DESCRIPTION_SLICE_FOR_TRUNCATE)
  if (nextChar && !/\s/.test(nextChar)) {
    const lastWs = cut.search(/\s\S*$/)
    if (lastWs > 0) {
      cut = cut.slice(0, lastWs)
    }
  }
  return { raw, oneLine: cut.trimEnd() + '…' }
}

/**
 * Detect whether a raw file body contains a YAML frontmatter block.
 * gray-matter returns `data: {}` both when the block is missing AND when
 * the block is empty (`---\n---`); we need to distinguish "absent" from
 * "present-but-empty" for the FrontmatterStatus enum.
 */
function hasFrontmatterDelimiter(content: string): boolean {
  // First non-whitespace line must be exactly `---` (allowing CR).
  // gray-matter's own detection is more permissive but for our status enum
  // a stricter check matches the spec's "frontmatter가 없으면" intent.
  return /^---\s*\r?\n/.test(content)
}

export function parseFrontmatterContent(content: string): ParsedFrontmatter {
  if (!hasFrontmatterDelimiter(content)) {
    return {
      frontmatter: {},
      frontmatterStatus: 'absent',
      bodyMarkdown: content,
      description: undefined,
    }
  }

  try {
    const parsed = matter(content, SAFE_MATTER_OPTS)
    const data = (parsed.data ?? {}) as Record<string, unknown>
    return {
      frontmatter: data,
      frontmatterStatus: 'present',
      bodyMarkdown: parsed.content ?? '',
      description: normalizeDescription(data.description),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      frontmatter: {},
      frontmatterStatus: 'malformed',
      bodyMarkdown: content,
      description: undefined,
      error: message,
    }
  }
}

export async function parseFrontmatterFile(absPath: string): Promise<ParsedFrontmatter> {
  let content: string
  try {
    content = await fs.readFile(absPath, 'utf8')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      frontmatter: {},
      frontmatterStatus: 'absent',
      bodyMarkdown: '',
      description: undefined,
      error: message,
    }
  }
  return parseFrontmatterContent(content)
}
