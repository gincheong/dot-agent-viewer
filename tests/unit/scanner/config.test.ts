import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { loadUserConfig } from '../../../src/main/scanner/config'

async function mkdtemp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'dot-agent-config-'))
}

async function writeJson(p: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf8')
}

describe('loadUserConfig', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await mkdtemp()
  })

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('returns defaults when config file is absent', async () => {
    const loaded = await loadUserConfig(path.join(tmp, 'missing.json'))
    expect(loaded.config.mergeStrategy).toBe('append')
    expect(loaded.config.roots.length).toBeGreaterThan(0)
    expect(loaded.config.roots.some((r) => r.name === 'Claude')).toBe(true)
    expect(loaded.config.roots.some((r) => r.name === 'Gemini')).toBe(true)
  })

  it('disables hub-grouping (originalsRootResolved=null) when default originals path is missing', async () => {
    // Use a config that explicitly points originalsRoot at a fake dir under tmp.
    const cfg = path.join(tmp, 'config.json')
    await writeJson(cfg, { originalsRoot: path.join(tmp, 'fake-originals') })
    const loaded = await loadUserConfig(cfg)
    expect(loaded.originalsRootResolved).toBeNull()
    expect(loaded.warnings.some((w) => w.includes('originalsRoot does not exist'))).toBe(true)
  })

  it('resolves a custom originalsRoot that exists on disk', async () => {
    const customOriginals = path.join(tmp, 'my-agents')
    await fs.mkdir(customOriginals, { recursive: true })
    const cfg = path.join(tmp, 'config.json')
    await writeJson(cfg, { originalsRoot: customOriginals })
    const loaded = await loadUserConfig(cfg)
    expect(loaded.config.originalsRoot).toBe(customOriginals)
    expect(loaded.originalsRootResolved).toBe(customOriginals)
  })

  it('appends a custom agent root in append mode (default)', async () => {
    const cfg = path.join(tmp, 'config.json')
    const codexPath = path.join(tmp, '.codex')
    await fs.mkdir(codexPath, { recursive: true })
    await writeJson(cfg, {
      roots: [
        {
          name: 'Codex',
          path: codexPath,
          scopes: [{ glob: '**/*.md', kind: 'any' }],
        },
      ],
    })
    const loaded = await loadUserConfig(cfg)
    expect(loaded.config.mergeStrategy).toBe('append')
    expect(loaded.config.roots.some((r) => r.name === 'Codex')).toBe(true)
    expect(loaded.config.roots.some((r) => r.name === 'Claude')).toBe(true)
    expect(loaded.config.roots.some((r) => r.name === 'Gemini')).toBe(true)
  })

  it('replaces defaults in replace mode', async () => {
    const cfg = path.join(tmp, 'config.json')
    const onlyPath = path.join(tmp, '.solo')
    await writeJson(cfg, {
      mergeStrategy: 'replace',
      roots: [
        {
          name: 'Solo',
          path: onlyPath,
          scopes: [{ glob: '**/*.md', kind: 'any' }],
        },
      ],
    })
    const loaded = await loadUserConfig(cfg)
    expect(loaded.config.mergeStrategy).toBe('replace')
    expect(loaded.config.roots.length).toBe(1)
    expect(loaded.config.roots[0].name).toBe('Solo')
  })

  it('expands ~ in originalsRoot and root.path', async () => {
    const cfg = path.join(tmp, 'config.json')
    await writeJson(cfg, {
      originalsRoot: '~/.agents-fake',
      roots: [
        {
          name: 'Tilde',
          path: '~/.tilde-root',
          scopes: [{ glob: '**/*.md', kind: 'any' }],
        },
      ],
    })
    const loaded = await loadUserConfig(cfg)
    expect(loaded.config.originalsRoot?.startsWith('/')).toBe(true)
    expect(loaded.config.originalsRoot?.includes('~')).toBe(false)
    const tilde = loaded.config.roots.find((r) => r.name === 'Tilde')!
    expect(tilde.path.startsWith('/')).toBe(true)
    expect(tilde.path).toContain(path.join(os.homedir(), '.tilde-root'))
  })

  it('honors originalsRoot: null to explicitly disable hub-grouping', async () => {
    const cfg = path.join(tmp, 'config.json')
    await writeJson(cfg, { originalsRoot: null })
    const loaded = await loadUserConfig(cfg)
    expect(loaded.config.originalsRoot).toBeNull()
    expect(loaded.originalsRootResolved).toBeNull()
  })
})
