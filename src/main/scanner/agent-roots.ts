// Inverted, agent-root-driven scanner. See plan §4 Phase 2.
//
// For every configured AgentRoot we enumerate per its scope globs, lstat each
// entry, and bucket into:
//   (a) symlink → target inside originalsRoot  → SymlinkRef on hub item
//   (b) symlink → target outside originalsRoot → SourceItem (external-link)
//   (c) regular file/dir (not a symlink)       → SourceItem (agent-local)
//   (d) unreadable / special                   → warning, no emission

import fastGlob from 'fast-glob'
import { promises as fs } from 'fs'
import path from 'path'

import type {
  AgentRoot,
  AgentRootConfig,
  AgentRootScope,
  ScanWarning,
  SourceItem,
  SymlinkRef,
} from '../../shared/types'
import { parseFrontmatterContent, parseFrontmatterFile } from './frontmatter'
import type { OriginalsIndex } from './sources'

export type AgentRootScanResult = {
  externalAndLocalItems: SourceItem[]
  warnings: ScanWarning[]
}

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.omc/**',
  '**/.omc',
]

function stripAgentRoot(config: AgentRootConfig): AgentRoot {
  return { name: config.name, path: config.path }
}

function withinDir(absPath: string, dir: string): boolean {
  const rel = path.relative(dir, absPath)
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel)
}

function isLikelyMarkdownish(absPath: string): boolean {
  return absPath.toLowerCase().endsWith('.md')
}

/**
 * For an entry under an agent-root scope, decide whether it's a markdown file
 * we want to surface or a skill directory. Returns null if we should skip
 * (e.g. directories under a 'command' scope, or non-markdown files).
 */
function classifyScopeEntry(
  absPath: string,
  isDir: boolean,
  scope: AgentRootScope
): 'command' | 'skill' | null {
  if (scope.kind === 'command') {
    if (isDir) return null
    return isLikelyMarkdownish(absPath) ? 'command' : null
  }
  if (scope.kind === 'skill') {
    if (!isDir) return null
    return 'skill'
  }
  // 'any' scope: file → command, dir → skill
  if (isDir) return 'skill'
  return isLikelyMarkdownish(absPath) ? 'command' : null
}

async function readlinkResolved(linkPath: string): Promise<string | null> {
  try {
    const raw = await fs.readlink(linkPath)
    return path.isAbsolute(raw) ? raw : path.resolve(path.dirname(linkPath), raw)
  } catch {
    return null
  }
}

async function safeLstat(p: string) {
  try {
    return await fs.lstat(p)
  } catch {
    return null
  }
}

async function safeStat(p: string) {
  // NOTE: fs.stat follows symlinks by OS default. For symlink-chain handling
  // (Critic residual #4), this means we land on the final file after the OS
  // resolves the chain — we do NOT follow transitively in user space. This
  // is intentional: APFS already enforces symlink-loop limits and we trust
  // the OS's resolution semantics here.
  try {
    return await fs.stat(p)
  } catch {
    return null
  }
}

export async function scanAgentRoots(
  configs: AgentRootConfig[],
  originalsRoot: string | null,
  index: OriginalsIndex
): Promise<AgentRootScanResult> {
  const result: AgentRootScanResult = {
    externalAndLocalItems: [],
    warnings: [],
  }

  await Promise.all(
    configs.map(async (config) => {
      const rootStat = await safeStat(config.path)
      if (!rootStat || !rootStat.isDirectory()) {
        result.warnings.push({
          kind: 'access',
          path: config.path,
          message: `agent root not found or not a directory: ${config.path}`,
        })
        return
      }
      await scanOneRoot(config, originalsRoot, index, result)
    })
  )

  return result
}

async function scanOneRoot(
  config: AgentRootConfig,
  originalsRoot: string | null,
  index: OriginalsIndex,
  out: AgentRootScanResult
): Promise<void> {
  const owner = stripAgentRoot(config)

  // Use a Set to dedupe paths a single entry may match under multiple scopes
  // (e.g. Gemini's `**/*.md` + `antigravity/skills/*`).
  const seen = new Set<string>()

  for (const scope of config.scopes) {
    let matches: string[] = []
    try {
      matches = await fastGlob(scope.glob, {
        cwd: config.path,
        onlyFiles: false,
        followSymbolicLinks: false,
        dot: true,
        ignore: IGNORE_PATTERNS,
        absolute: true,
        markDirectories: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      out.warnings.push({
        kind: 'access',
        path: path.join(config.path, scope.glob),
        message: `glob failed: ${message}`,
      })
      continue
    }

    for (const absPath of matches) {
      if (seen.has(absPath)) continue
      seen.add(absPath)
      await processEntry(absPath, scope, config, owner, originalsRoot, index, out)
    }
  }
}

async function processEntry(
  absPath: string,
  scope: AgentRootScope,
  config: AgentRootConfig,
  owner: AgentRoot,
  originalsRoot: string | null,
  index: OriginalsIndex,
  out: AgentRootScanResult
): Promise<void> {
  const lst = await safeLstat(absPath)
  if (!lst) {
    out.warnings.push({
      kind: 'access',
      path: absPath,
      message: 'lstat failed',
    })
    return
  }

  if (lst.isSymbolicLink()) {
    await handleSymlink(absPath, scope, owner, originalsRoot, index, out)
    return
  }

  // Regular file or directory.
  const isDir = lst.isDirectory()
  const isFile = lst.isFile()
  if (!isDir && !isFile) {
    // Bucket (d): special files (sockets, fifos, etc.) — warn, no emission.
    out.warnings.push({
      kind: 'access',
      path: absPath,
      message: 'special file (not a regular file, dir, or symlink)',
    })
    return
  }

  const kind = classifyScopeEntry(absPath, isDir, scope)
  if (!kind) return

  // Bucket (c): agent-local
  await emitLocalItem(absPath, kind, owner, out)
}

async function handleSymlink(
  linkPath: string,
  scope: AgentRootScope,
  owner: AgentRoot,
  originalsRoot: string | null,
  index: OriginalsIndex,
  out: AgentRootScanResult
): Promise<void> {
  const target = await readlinkResolved(linkPath)
  if (!target) {
    out.warnings.push({
      kind: 'access',
      path: linkPath,
      message: 'readlink failed on symlink',
    })
    return
  }

  // Does the canonical target resolve? (broken symlinks => stat null)
  const targetStat = await safeStat(linkPath) // follows the chain by OS semantics
  const broken = targetStat === null

  // Determine whether the target points into originalsRoot.
  const targetInsideHub =
    !!originalsRoot && (target === originalsRoot || withinDir(target, originalsRoot))

  if (targetInsideHub && originalsRoot) {
    // Bucket (a)
    const hubItem =
      index.originalsByAbsPath.get(target) ?? index.originalsBySkillRoot.get(target)

    if (hubItem) {
      const ref: SymlinkRef = {
        linkPath,
        agentRoot: owner,
        broken,
        targetPath: target,
      }
      hubItem.symlinks.push(ref)
      return
    }

    // Target resolves inside hub but we did not pre-index it (e.g. unusual
    // file in originalsRoot not under commands/ or skills/). Surface as a
    // warning to remain "honest" — never silently drop.
    out.warnings.push({
      kind: 'access',
      path: linkPath,
      message: `symlink targets inside originalsRoot but no hub item indexed: ${target}`,
    })
    return
  }

  // Bucket (b): external-link (target outside hub, or hub disabled)
  await emitExternalLink(linkPath, target, broken, targetStat?.isDirectory() ?? false, scope, owner, out)
}

async function emitLocalItem(
  absPath: string,
  kind: 'command' | 'skill',
  owner: AgentRoot,
  out: AgentRootScanResult
): Promise<void> {
  if (kind === 'command') {
    const parsed = await parseFrontmatterFile(absPath)
    const item: SourceItem = {
      kind: 'command',
      provenance: 'agent-local',
      name: path.basename(absPath, path.extname(absPath)),
      description: parsed.description,
      absPath,
      frontmatter: parsed.frontmatter,
      frontmatterStatus: parsed.frontmatterStatus,
      bodyMarkdown: parsed.bodyMarkdown,
      symlinks: [],
      ownerAgentRoot: owner,
    }
    if (parsed.frontmatterStatus === 'malformed') {
      out.warnings.push({
        kind: 'parse',
        path: absPath,
        message: parsed.error ?? 'malformed frontmatter',
      })
    }
    out.externalAndLocalItems.push(item)
    return
  }

  // skill dir
  await emitLocalSkill(absPath, owner, out)
}

async function emitLocalSkill(
  skillRoot: string,
  owner: AgentRoot,
  out: AgentRootScanResult
): Promise<void> {
  const entries = await safeReaddir(skillRoot)
  let entryFile: string | null = null
  if (entries) {
    if (entries.includes('SKILL.md')) entryFile = 'SKILL.md'
    else entryFile = entries.filter((e) => e.toLowerCase().endsWith('.md')).sort()[0] ?? null
  }

  if (!entryFile) {
    const item: SourceItem = {
      kind: 'skill',
      provenance: 'agent-local',
      name: path.basename(skillRoot),
      absPath: skillRoot,
      skillRootPath: skillRoot,
      frontmatter: {},
      frontmatterStatus: 'absent',
      bodyMarkdown: '',
      symlinks: [],
      ownerAgentRoot: owner,
    }
    out.externalAndLocalItems.push(item)
    return
  }

  const entryAbs = path.join(skillRoot, entryFile)
  const parsed = await parseFrontmatterFile(entryAbs)
  const item: SourceItem = {
    kind: 'skill',
    provenance: 'agent-local',
    name: path.basename(skillRoot),
    description: parsed.description,
    absPath: entryAbs,
    skillRootPath: skillRoot,
    entryFile,
    frontmatter: parsed.frontmatter,
    frontmatterStatus: parsed.frontmatterStatus,
    bodyMarkdown: parsed.bodyMarkdown,
    symlinks: [],
    ownerAgentRoot: owner,
  }
  if (parsed.frontmatterStatus === 'malformed') {
    out.warnings.push({
      kind: 'parse',
      path: entryAbs,
      message: parsed.error ?? 'malformed frontmatter',
    })
  }
  out.externalAndLocalItems.push(item)
}

async function emitExternalLink(
  linkPath: string,
  targetPath: string,
  broken: boolean,
  targetIsDir: boolean,
  scope: AgentRootScope,
  owner: AgentRoot,
  out: AgentRootScanResult
): Promise<void> {
  // Decide kind based on scope + target shape.
  const kind: 'command' | 'skill' =
    scope.kind === 'skill' || targetIsDir
      ? 'skill'
      : scope.kind === 'command'
        ? 'command'
        : 'command'

  if (broken) {
    const item: SourceItem = {
      kind,
      provenance: 'external-link',
      name: kind === 'skill' ? path.basename(linkPath) : path.basename(linkPath, path.extname(linkPath)),
      absPath: linkPath,
      frontmatter: {},
      frontmatterStatus: 'absent',
      bodyMarkdown: '',
      symlinks: [],
      ownerAgentRoot: owner,
      externalTargetPath: targetPath,
      broken: true,
    }
    out.warnings.push({
      kind: 'access',
      path: linkPath,
      message: `external symlink target missing: ${targetPath}`,
    })
    out.externalAndLocalItems.push(item)
    return
  }

  if (kind === 'skill') {
    // Treat target as a skill dir.
    const entries = await safeReaddir(targetPath)
    let entryFile: string | null = null
    if (entries) {
      if (entries.includes('SKILL.md')) entryFile = 'SKILL.md'
      else entryFile = entries.filter((e) => e.toLowerCase().endsWith('.md')).sort()[0] ?? null
    }
    const entryAbs = entryFile ? path.join(targetPath, entryFile) : null
    const parsed = entryAbs
      ? await parseFrontmatterFile(entryAbs)
      : { frontmatter: {}, frontmatterStatus: 'absent' as const, bodyMarkdown: '', description: undefined }

    const item: SourceItem = {
      kind: 'skill',
      provenance: 'external-link',
      name: path.basename(linkPath),
      description: parsed.description,
      absPath: entryAbs ?? linkPath,
      skillRootPath: targetPath,
      entryFile: entryFile ?? undefined,
      frontmatter: parsed.frontmatter,
      frontmatterStatus: parsed.frontmatterStatus,
      bodyMarkdown: parsed.bodyMarkdown,
      symlinks: [],
      ownerAgentRoot: owner,
      externalTargetPath: targetPath,
    }
    out.externalAndLocalItems.push(item)
    return
  }

  // command: parse the followed file directly via the link path (fs.readFile
  // follows the symlink by OS default — same semantics as fs.stat above).
  let content: string
  try {
    content = await fs.readFile(linkPath, 'utf8')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    out.warnings.push({
      kind: 'access',
      path: linkPath,
      message: `external-link target unreadable: ${message}`,
    })
    const item: SourceItem = {
      kind: 'command',
      provenance: 'external-link',
      name: path.basename(linkPath, path.extname(linkPath)),
      absPath: linkPath,
      frontmatter: {},
      frontmatterStatus: 'absent',
      bodyMarkdown: '',
      symlinks: [],
      ownerAgentRoot: owner,
      externalTargetPath: targetPath,
      broken: true,
    }
    out.externalAndLocalItems.push(item)
    return
  }

  const parsed = parseFrontmatterContent(content)
  const item: SourceItem = {
    kind: 'command',
    provenance: 'external-link',
    name: path.basename(linkPath, path.extname(linkPath)),
    description: parsed.description,
    absPath: linkPath,
    frontmatter: parsed.frontmatter,
    frontmatterStatus: parsed.frontmatterStatus,
    bodyMarkdown: parsed.bodyMarkdown,
    symlinks: [],
    ownerAgentRoot: owner,
    externalTargetPath: targetPath,
  }
  if (parsed.frontmatterStatus === 'malformed') {
    out.warnings.push({
      kind: 'parse',
      path: linkPath,
      message: parsed.error ?? 'malformed frontmatter at external-link target',
    })
  }
  out.externalAndLocalItems.push(item)
}

async function safeReaddir(dir: string): Promise<string[] | null> {
  try {
    return await fs.readdir(dir)
  } catch {
    return null
  }
}
