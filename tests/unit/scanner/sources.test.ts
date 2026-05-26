import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildOriginalsIndex } from '../../../src/main/scanner/sources'

async function mkdtemp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'dot-agent-sources-'))
}

async function write(p: string, body: string): Promise<void> {
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, body, 'utf8')
}

describe('buildOriginalsIndex', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await mkdtemp()
  })

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('returns empty index when originalsRoot is null', async () => {
    const idx = await buildOriginalsIndex(null)
    expect(idx.items).toEqual([])
  })

  it('warns when originalsRoot path does not exist', async () => {
    const idx = await buildOriginalsIndex(path.join(tmp, 'nonexistent'))
    expect(idx.items).toEqual([])
    expect(idx.warnings.length).toBeGreaterThan(0)
    expect(idx.warnings[0].kind).toBe('access')
  })

  it('lists commands/*.md as command-kind hub items', async () => {
    await write(
      path.join(tmp, 'commands', 'alpha.md'),
      ['---', 'description: alpha cmd', '---', 'body'].join('\n')
    )
    await write(
      path.join(tmp, 'commands', 'beta.md'),
      ['---', 'description: beta cmd', '---', 'body'].join('\n')
    )

    const idx = await buildOriginalsIndex(tmp)
    const commands = idx.items.filter((i) => i.kind === 'command')
    expect(commands.length).toBe(2)
    expect(commands.every((c) => c.provenance === 'agents-hub')).toBe(true)
    expect(commands.map((c) => c.name).sort()).toEqual(['alpha', 'beta'])
  })

  it('skips non-md files in commands directory', async () => {
    await write(path.join(tmp, 'commands', 'readme.txt'), 'not markdown')
    await write(path.join(tmp, 'commands', 'cmd.md'), 'body')

    const idx = await buildOriginalsIndex(tmp)
    expect(idx.items.length).toBe(1)
    expect(idx.items[0].name).toBe('cmd')
  })

  it('lists skills/* as skill-kind hub items', async () => {
    await write(
      path.join(tmp, 'skills', 'alpha', 'SKILL.md'),
      ['---', 'name: alpha', '---', 'body'].join('\n')
    )
    await fs.mkdir(path.join(tmp, 'skills', 'beta'), { recursive: true })

    const idx = await buildOriginalsIndex(tmp)
    const skills = idx.items.filter((i) => i.kind === 'skill')
    expect(skills.length).toBe(2)
    expect(skills.map((s) => s.name).sort()).toEqual(['alpha', 'beta'])
  })

  it('prefers SKILL.md over other .md files in a skill dir', async () => {
    await write(path.join(tmp, 'skills', 'foo', 'README.md'), 'readme body')
    await write(
      path.join(tmp, 'skills', 'foo', 'SKILL.md'),
      ['---', 'name: foo', '---', 'skill body'].join('\n')
    )

    const idx = await buildOriginalsIndex(tmp)
    const skill = idx.items.find((i) => i.name === 'foo')!
    expect(skill.entryFile).toBe('SKILL.md')
    expect(skill.absPath.endsWith('SKILL.md')).toBe(true)
    expect(skill.bodyMarkdown).toContain('skill body')
  })

  it('falls back to the first lex .md when SKILL.md is missing', async () => {
    await write(path.join(tmp, 'skills', 'bar', 'b-second.md'), 'b body')
    await write(path.join(tmp, 'skills', 'bar', 'a-first.md'), 'a body')

    const idx = await buildOriginalsIndex(tmp)
    const skill = idx.items.find((i) => i.name === 'bar')!
    expect(skill.entryFile).toBe('a-first.md')
  })

  it('emits a placeholder with absent frontmatter for an empty skill dir', async () => {
    await fs.mkdir(path.join(tmp, 'skills', 'empty'), { recursive: true })

    const idx = await buildOriginalsIndex(tmp)
    const skill = idx.items.find((i) => i.name === 'empty')!
    expect(skill).toBeDefined()
    expect(skill.frontmatterStatus).toBe('absent')
    expect(skill.bodyMarkdown).toBe('')
    expect(skill.skillRootPath).toBe(path.join(tmp, 'skills', 'empty'))
  })

  it('populates originalsByAbsPath and originalsBySkillRoot maps', async () => {
    const cmdPath = path.join(tmp, 'commands', 'a.md')
    await write(cmdPath, 'body')
    const skillRoot = path.join(tmp, 'skills', 's')
    const skillEntry = path.join(skillRoot, 'SKILL.md')
    await write(skillEntry, 'body')

    const idx = await buildOriginalsIndex(tmp)
    expect(idx.originalsByAbsPath.get(cmdPath)).toBeDefined()
    expect(idx.originalsByAbsPath.get(skillEntry)).toBeDefined()
    expect(idx.originalsBySkillRoot.get(skillRoot)).toBeDefined()
  })
})
