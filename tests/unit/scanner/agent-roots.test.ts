import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { scanAgentRoots } from '../../../src/main/scanner/agent-roots'
import { buildOriginalsIndex } from '../../../src/main/scanner/sources'
import type { AgentRootConfig } from '../../../src/shared/types'

async function mkdtemp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'dot-agent-roots-'))
}

async function write(p: string, body: string): Promise<void> {
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, body, 'utf8')
}

async function symlink(target: string, linkPath: string): Promise<void> {
  await fs.mkdir(path.dirname(linkPath), { recursive: true })
  await fs.symlink(target, linkPath)
}

/**
 * Build a fixture tree shaped like:
 *
 *   <tmp>/.agents/commands/sample.md         (hub original)
 *   <tmp>/.agents/skills/foo/SKILL.md        (hub original)
 *   <tmp>/.claude/commands/sample.md -> ../../.agents/commands/sample.md   (bucket a, nested)
 *   <tmp>/.claude/commands/external.md -> <tmp>/external/external.md       (bucket b)
 *   <tmp>/.claude/commands/broken.md -> ../../.agents/commands/missing.md  (bucket a broken)
 *   <tmp>/.claude/skills/foo -> ../../.agents/skills/foo                   (bucket a skill-dir)
 *   <tmp>/.gemini/sample.md -> ../.agents/commands/sample.md               (bucket a, flat)
 *   <tmp>/.gemini/GEMINI.md                                                (bucket c)
 */
async function buildFixture(tmp: string): Promise<{
  originalsRoot: string
  claudeRoot: string
  geminiRoot: string
  externalFile: string
}> {
  const originalsRoot = path.join(tmp, '.agents')
  const claudeRoot = path.join(tmp, '.claude')
  const geminiRoot = path.join(tmp, '.gemini')
  const externalDir = path.join(tmp, 'external')
  const externalFile = path.join(externalDir, 'external.md')

  // Hub originals
  await write(
    path.join(originalsRoot, 'commands', 'sample.md'),
    ['---', 'description: sample cmd', '---', 'sample body'].join('\n')
  )
  await write(
    path.join(originalsRoot, 'skills', 'foo', 'SKILL.md'),
    ['---', 'name: foo', 'description: foo skill', '---', 'foo body'].join('\n')
  )

  // External (outside hub)
  await write(externalFile, ['---', 'description: external', '---', 'body'].join('\n'))

  // Claude: nested symlink (bucket a)
  await symlink(
    path.join(originalsRoot, 'commands', 'sample.md'),
    path.join(claudeRoot, 'commands', 'sample.md')
  )
  // Claude: external symlink (bucket b)
  await symlink(externalFile, path.join(claudeRoot, 'commands', 'external.md'))
  // Claude: broken symlink (bucket a broken)
  await symlink(
    path.join(originalsRoot, 'commands', 'missing.md'),
    path.join(claudeRoot, 'commands', 'broken.md')
  )
  // Claude: skill-dir symlink (bucket a, skill-dir)
  await symlink(
    path.join(originalsRoot, 'skills', 'foo'),
    path.join(claudeRoot, 'skills', 'foo')
  )

  // Gemini: flat-root symlink (bucket a, flat)
  await symlink(
    path.join(originalsRoot, 'commands', 'sample.md'),
    path.join(geminiRoot, 'sample.md')
  )
  // Gemini: regular file (bucket c)
  await write(path.join(geminiRoot, 'GEMINI.md'), 'just a real file')

  return { originalsRoot, claudeRoot, geminiRoot, externalFile }
}

function configsFor(claudeRoot: string, geminiRoot: string): AgentRootConfig[] {
  return [
    {
      name: 'Claude',
      path: claudeRoot,
      scopes: [
        { glob: 'commands/**/*.md', kind: 'command' },
        { glob: 'skills/*', kind: 'skill' },
      ],
    },
    {
      name: 'Gemini',
      path: geminiRoot,
      scopes: [{ glob: '**/*.md', kind: 'any' }],
    },
  ]
}

describe('scanAgentRoots — provenance buckets', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await mkdtemp()
  })

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('bucket (a) nested: symlink under .claude/commands -> hub command attaches SymlinkRef', async () => {
    const { originalsRoot, claudeRoot, geminiRoot } = await buildFixture(tmp)
    const idx = await buildOriginalsIndex(originalsRoot)
    const result = await scanAgentRoots(configsFor(claudeRoot, geminiRoot), originalsRoot, idx)

    const hubCmd = idx.items.find((i) => i.kind === 'command' && i.name === 'sample')!
    expect(hubCmd).toBeDefined()
    const nestedRef = hubCmd.symlinks.find((s) =>
      s.linkPath.endsWith(path.join('.claude', 'commands', 'sample.md'))
    )
    expect(nestedRef).toBeDefined()
    expect(nestedRef!.agentRoot.name).toBe('Claude')
    expect(nestedRef!.broken).toBe(false)
    // Should NOT have emitted a standalone source for this link.
    expect(
      result.externalAndLocalItems.some(
        (i) => i.absPath.endsWith(path.join('.claude', 'commands', 'sample.md'))
      )
    ).toBe(false)
  })

  it('bucket (a) flat: symlink in .gemini root -> hub command attaches SymlinkRef', async () => {
    const { originalsRoot, claudeRoot, geminiRoot } = await buildFixture(tmp)
    const idx = await buildOriginalsIndex(originalsRoot)
    await scanAgentRoots(configsFor(claudeRoot, geminiRoot), originalsRoot, idx)

    const hubCmd = idx.items.find((i) => i.name === 'sample')!
    const flatRef = hubCmd.symlinks.find((s) =>
      s.linkPath.endsWith(path.join('.gemini', 'sample.md'))
    )
    expect(flatRef).toBeDefined()
    expect(flatRef!.agentRoot.name).toBe('Gemini')
  })

  it('bucket (a) skill-dir: symlink targeting a skill directory attaches SymlinkRef', async () => {
    const { originalsRoot, claudeRoot, geminiRoot } = await buildFixture(tmp)
    const idx = await buildOriginalsIndex(originalsRoot)
    await scanAgentRoots(configsFor(claudeRoot, geminiRoot), originalsRoot, idx)

    const hubSkill = idx.items.find((i) => i.kind === 'skill' && i.name === 'foo')!
    expect(hubSkill).toBeDefined()
    const skillRef = hubSkill.symlinks.find((s) =>
      s.linkPath.endsWith(path.join('.claude', 'skills', 'foo'))
    )
    expect(skillRef).toBeDefined()
  })

  it('bucket (b): symlink target outside originals -> external-link SourceItem', async () => {
    const { originalsRoot, claudeRoot, geminiRoot, externalFile } = await buildFixture(tmp)
    const idx = await buildOriginalsIndex(originalsRoot)
    const result = await scanAgentRoots(configsFor(claudeRoot, geminiRoot), originalsRoot, idx)

    const external = result.externalAndLocalItems.find(
      (i) => i.provenance === 'external-link' && i.name === 'external'
    )
    expect(external).toBeDefined()
    expect(external!.externalTargetPath).toBe(externalFile)
    expect(external!.ownerAgentRoot?.name).toBe('Claude')
    expect(external!.broken).not.toBe(true)
    // frontmatter should have been parsed from the external file
    expect(external!.frontmatter.description).toBe('external')
  })

  it('bucket (c): real non-symlink file under agent root -> agent-local SourceItem', async () => {
    const { originalsRoot, claudeRoot, geminiRoot } = await buildFixture(tmp)
    const idx = await buildOriginalsIndex(originalsRoot)
    const result = await scanAgentRoots(configsFor(claudeRoot, geminiRoot), originalsRoot, idx)

    const gemini = result.externalAndLocalItems.find(
      (i) => i.provenance === 'agent-local' && i.name === 'GEMINI'
    )
    expect(gemini).toBeDefined()
    expect(gemini!.ownerAgentRoot?.name).toBe('Gemini')
    expect(gemini!.absPath.endsWith('GEMINI.md')).toBe(true)
    expect(gemini!.frontmatterStatus).toBe('absent')
  })

  it('bucket (a) broken: symlink with missing target still attaches a broken SymlinkRef on hub', async () => {
    const { originalsRoot, claudeRoot, geminiRoot } = await buildFixture(tmp)
    const idx = await buildOriginalsIndex(originalsRoot)
    // Pre-populate the hub with the missing target so it CAN be matched after
    // we delete it post-stat.
    const missingPath = path.join(originalsRoot, 'commands', 'missing.md')
    // We did NOT create missing.md, so the symlink in claude/commands/broken.md
    // is broken. To make the symlink attach to a hub entry, we need 'missing'
    // to exist in the originals index. We create it, build index, then delete it.
    await write(missingPath, '---\n---\nfine')
    const populatedIdx = await buildOriginalsIndex(originalsRoot)
    await fs.rm(missingPath, { force: true })

    const result = await scanAgentRoots(
      configsFor(claudeRoot, geminiRoot),
      originalsRoot,
      populatedIdx
    )

    const hubMissing = populatedIdx.items.find((i) => i.name === 'missing')!
    expect(hubMissing).toBeDefined()
    const brokenRef = hubMissing.symlinks.find((s) =>
      s.linkPath.endsWith(path.join('.claude', 'commands', 'broken.md'))
    )
    expect(brokenRef).toBeDefined()
    expect(brokenRef!.broken).toBe(true)
    // result was produced; ensure no duplicate emission as external-link
    expect(
      result.externalAndLocalItems.some((i) => i.name === 'broken')
    ).toBe(false)
  })

  it('with originalsRoot disabled (null), bucket (a) symlinks become external-link items', async () => {
    const { claudeRoot, geminiRoot } = await buildFixture(tmp)
    const idx = await buildOriginalsIndex(null)
    const result = await scanAgentRoots(configsFor(claudeRoot, geminiRoot), null, idx)

    // The previously-nested-to-hub sample symlink under .claude/commands/sample.md
    // should now surface as a standalone external-link item.
    const standalone = result.externalAndLocalItems.find(
      (i) => i.provenance === 'external-link' && i.name === 'sample' && i.ownerAgentRoot?.name === 'Claude'
    )
    expect(standalone).toBeDefined()
  })

  it('warns about missing agent-root paths and continues with others', async () => {
    const { originalsRoot, claudeRoot, geminiRoot } = await buildFixture(tmp)
    const idx = await buildOriginalsIndex(originalsRoot)
    const configs = configsFor(claudeRoot, geminiRoot)
    configs.push({
      name: 'Codex',
      path: path.join(tmp, '.codex-missing'),
      scopes: [{ glob: '**/*.md', kind: 'any' }],
    })
    const result = await scanAgentRoots(configs, originalsRoot, idx)
    expect(result.warnings.some((w) => w.path.endsWith('.codex-missing'))).toBe(true)
  })
})
