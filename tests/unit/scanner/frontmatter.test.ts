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
