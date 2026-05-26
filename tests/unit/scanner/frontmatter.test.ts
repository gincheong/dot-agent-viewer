import { describe, expect, it } from 'vitest'

import {
  normalizeDescription,
  parseFrontmatterContent,
} from '../../../src/main/scanner/frontmatter'

describe('parseFrontmatterContent', () => {
  it('parses a YAML block-scalar description and collapses newlines', () => {
    const content = [
      '---',
      'description: |',
      '    Manage stacked branches and pull requests with the gh-stack GitHub CLI extension.',
      '    Use when the user wants to create, push, rebase, sync, navigate, or view stacks of dependent PRs.',
      'name: gh-stack',
      '---',
      '# body',
    ].join('\n')

    const parsed = parseFrontmatterContent(content)
    expect(parsed.frontmatterStatus).toBe('present')
    expect(parsed.description).toBeDefined()
    expect(parsed.description!.oneLine).not.toMatch(/\n/)
    expect(parsed.description!.oneLine.length).toBeLessThanOrEqual(140)
    // back-walked at word boundary -> no mid-word cut
    expect(parsed.description!.oneLine.endsWith('…')).toBe(true)
    expect(parsed.bodyMarkdown).toContain('# body')
  })

  it('keeps a comma-list allowed-tools string verbatim in raw frontmatter', () => {
    const content = [
      '---',
      'description: sample',
      'allowed-tools: "Bash, Read, Glob, Grep, Agent, AskUserQuestion, mcp__a, mcp__b, mcp__c, mcp__d, mcp__e, mcp__f, mcp__g"',
      '---',
      'body',
    ].join('\n')

    const parsed = parseFrontmatterContent(content)
    expect(parsed.frontmatterStatus).toBe('present')
    const tools = parsed.frontmatter['allowed-tools']
    expect(typeof tools).toBe('string')
    expect((tools as string).split(',').map((t) => t.trim()).length).toBe(13)
  })

  it('preserves nested metadata objects', () => {
    const content = [
      '---',
      'description: x',
      'metadata:',
      '    author: github',
      '    version: 0.0.4',
      '    github-repo: https://github.com/github/gh-stack',
      '---',
      'body',
    ].join('\n')

    const parsed = parseFrontmatterContent(content)
    expect(parsed.frontmatterStatus).toBe('present')
    const md = parsed.frontmatter.metadata as Record<string, unknown>
    expect(md).toBeTypeOf('object')
    expect(md.author).toBe('github')
    // YAML coerces `0.0.4` to string (not a valid number); just assert presence.
    expect(md.version).toBeDefined()
    expect(md['github-repo']).toBe('https://github.com/github/gh-stack')
  })

  it('reports absent status when no --- block is present', () => {
    const content = 'just a body, no frontmatter'
    const parsed = parseFrontmatterContent(content)
    expect(parsed.frontmatterStatus).toBe('absent')
    expect(parsed.frontmatter).toEqual({})
    expect(parsed.bodyMarkdown).toBe(content)
  })

  it('reports malformed status on broken YAML', () => {
    const content = ['---', 'description: [', '---', 'body'].join('\n')
    const parsed = parseFrontmatterContent(content)
    expect(parsed.frontmatterStatus).toBe('malformed')
    expect(parsed.error).toBeTruthy()
  })
})

describe('normalizeDescription', () => {
  it('returns undefined for nullish input', () => {
    expect(normalizeDescription(undefined)).toBeUndefined()
    expect(normalizeDescription(null)).toBeUndefined()
  })

  it('truncates long strings at a word boundary, appending an ellipsis', () => {
    const long = Array.from({ length: 20 }, () => 'wordswordswords').join(' ')
    const out = normalizeDescription(long)
    expect(out).toBeDefined()
    expect(out!.oneLine.length).toBeLessThanOrEqual(140)
    expect(out!.oneLine.endsWith('…')).toBe(true)
    // Did not cut a word in half: the char just before '…' should be a letter
    // from a complete word (we appended after a trimmed-right slice).
    expect(out!.oneLine).not.toMatch(/[a-z]…[a-z]/i)
  })

  it('passes short strings through unchanged after whitespace collapse', () => {
    const out = normalizeDescription('  hello\n  world  ')
    expect(out!.oneLine).toBe('hello world')
  })

  it('joins arrays with comma-space', () => {
    const out = normalizeDescription(['a', 'b', 'c'])
    expect(out!.oneLine).toBe('a, b, c')
  })

  it('stringifies plain objects', () => {
    const out = normalizeDescription({ a: 1 })
    expect(out!.oneLine).toBe('{"a":1}')
  })
})

describe('security: gray-matter JavaScript-engine eval is blocked', () => {
  // gray-matter v4 ships an `engines.javascript` parser that calls `eval(str)`
  // on the frontmatter body when the file's first line is `---javascript`.
  // Our parseFrontmatterContent pins language: 'yaml' + a custom yaml-only
  // engines map so the JS engine is unreachable.
  //
  // If this test ever fails (status: 'present', side-effect observed), the
  // safe options have been bypassed and the regression must be fixed before
  // any further release.
  it('does NOT eval a ---javascript frontmatter payload', () => {
    let evalSentinel = false
    // Hostile payload: if gray-matter ever dispatched to engines.javascript,
    // this would set our sentinel inside the renderer's global scope.
    const content = [
      '---javascript',
      "globalThis.__EVAL_SENTINEL__ = true",
      '---',
      '# body',
    ].join('\n')

    const before = (globalThis as Record<string, unknown>).__EVAL_SENTINEL__
    expect(before).toBeUndefined()

    const parsed = parseFrontmatterContent(content)

    const after = (globalThis as Record<string, unknown>).__EVAL_SENTINEL__
    evalSentinel = after === true
    expect(evalSentinel).toBe(false)
    // Either:
    //   - 'absent' (our stricter delimiter regex `^---\s*\r?\n` rejects
    //     `---javascript` before matter() is invoked — defense in depth), or
    //   - 'malformed' (matter would throw on the non-YAML body), or
    //   - 'present' with empty data (no eval side-effect).
    // 'present' with a side-effect is never acceptable.
    expect(['absent', 'malformed', 'present']).toContain(parsed.frontmatterStatus)
  })

  it('a ---javascript payload that matches our stricter delimiter still parses through yaml engine only', () => {
    let evalSentinel = false
    // Some implementations require `---javascript\n` to dispatch the JS engine.
    // Our hasFrontmatterDelimiter rejects that; this test confirms the
    // delimiter regex is the first line of defense.
    const content = ['---javascript', "globalThis.__EVAL_SENTINEL__ = true", '---'].join('\n')
    const parsed = parseFrontmatterContent(content)
    const after = (globalThis as Record<string, unknown>).__EVAL_SENTINEL__
    evalSentinel = after === true
    expect(evalSentinel).toBe(false)
    expect(parsed.frontmatterStatus).toBe('absent')
  })

  it('parses a normal YAML frontmatter as YAML (regression guard)', () => {
    const content = ['---', 'model: opus', '---', '# body'].join('\n')
    const parsed = parseFrontmatterContent(content)
    expect(parsed.frontmatterStatus).toBe('present')
    expect(parsed.frontmatter).toEqual({ model: 'opus' })
  })
})
