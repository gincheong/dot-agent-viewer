// User config loader. See plan §3 Persistence.
//
// Reads ~/.config/dot-agent-viewer/config.json (if present), merges with
// DEFAULT_USER_CONFIG. If originalsRoot is set but missing on disk,
// hub-grouping is disabled (originalsRoot effectively becomes null).

import { promises as fs } from 'fs'
import path from 'path'

import {
  DEFAULT_AGENT_ROOTS,
  DEFAULT_CONFIG_PATH,
  DEFAULT_ORIGINALS_ROOT,
  DEFAULT_USER_CONFIG,
  expandHome,
} from '../../shared/defaults'
import type { AgentRootConfig, UserConfig } from '../../shared/types'

export type LoadedConfig = {
  config: UserConfig
  configPath: string
  /** True iff config.originalsRoot points at an existing directory. */
  originalsRootResolved: string | null
  warnings: string[]
}

type RawScope = { glob?: unknown; kind?: unknown }
type RawRoot = { name?: unknown; path?: unknown; scopes?: unknown }
type RawConfig = {
  originalsRoot?: unknown
  roots?: unknown
  mergeStrategy?: unknown
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseScope(raw: unknown): AgentRootConfig['scopes'][number] | null {
  if (!isObject(raw)) return null
  const { glob, kind } = raw as RawScope
  if (typeof glob !== 'string') return null
  if (kind !== 'command' && kind !== 'skill' && kind !== 'any') return null
  return { glob, kind }
}

function parseRoot(raw: unknown): AgentRootConfig | null {
  if (!isObject(raw)) return null
  const { name, path: p, scopes } = raw as RawRoot
  if (typeof name !== 'string') return null
  if (typeof p !== 'string') return null
  if (!Array.isArray(scopes)) return null
  const parsedScopes = scopes
    .map(parseScope)
    .filter((s): s is AgentRootConfig['scopes'][number] => s !== null)
  if (parsedScopes.length === 0) return null
  return { name, path: expandHome(p), scopes: parsedScopes }
}

export function mergeRoots(
  defaults: AgentRootConfig[],
  user: AgentRootConfig[],
  strategy: 'append' | 'replace'
): AgentRootConfig[] {
  if (strategy === 'replace') return user
  // append: user roots after defaults, dedupe by path
  const byPath = new Map<string, AgentRootConfig>()
  for (const r of defaults) byPath.set(r.path, r)
  for (const r of user) byPath.set(r.path, r) // user overrides defaults at same path
  return Array.from(byPath.values())
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p)
    return st.isDirectory()
  } catch {
    return false
  }
}

async function readJsonFile(absPath: string): Promise<unknown | null> {
  try {
    const content = await fs.readFile(absPath, 'utf8')
    return JSON.parse(content)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

export async function loadUserConfig(configPath: string = DEFAULT_CONFIG_PATH): Promise<LoadedConfig> {
  const warnings: string[] = []
  let raw: unknown = null
  try {
    raw = await readJsonFile(configPath)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    warnings.push(`failed to read config at ${configPath}: ${msg}`)
  }

  let merged: UserConfig = { ...DEFAULT_USER_CONFIG, roots: [...DEFAULT_AGENT_ROOTS] }

  if (raw != null && isObject(raw)) {
    const r = raw as RawConfig
    const strategy: 'append' | 'replace' = r.mergeStrategy === 'replace' ? 'replace' : 'append'

    let originalsRoot: string | null = DEFAULT_ORIGINALS_ROOT
    if ('originalsRoot' in r) {
      if (r.originalsRoot === null) originalsRoot = null
      else if (typeof r.originalsRoot === 'string') originalsRoot = expandHome(r.originalsRoot)
      else warnings.push('config.originalsRoot must be string or null; ignored')
    }

    let userRoots: AgentRootConfig[] = []
    if (Array.isArray(r.roots)) {
      userRoots = r.roots
        .map(parseRoot)
        .filter((x): x is AgentRootConfig => x !== null)
      if (userRoots.length < r.roots.length) {
        warnings.push('one or more entries in config.roots were ignored (invalid shape)')
      }
    }

    merged = {
      originalsRoot,
      roots: mergeRoots(DEFAULT_AGENT_ROOTS, userRoots, strategy),
      mergeStrategy: strategy,
    }
  }

  // Validate originalsRoot existence; if missing, disable hub-grouping.
  let originalsRootResolved: string | null = null
  if (merged.originalsRoot) {
    const exists = await dirExists(merged.originalsRoot)
    if (exists) {
      originalsRootResolved = merged.originalsRoot
    } else {
      warnings.push(`originalsRoot does not exist on disk: ${merged.originalsRoot} — hub-grouping disabled`)
    }
  }

  return {
    config: merged,
    configPath,
    originalsRootResolved,
    warnings,
  }
}

export { DEFAULT_CONFIG_PATH }
export const __test = { parseRoot, parseScope, mergeRoots }
