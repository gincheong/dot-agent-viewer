// Originals (~/.agents) enumeration. See plan §4 Phase 1.

import { promises as fs } from 'fs'
import path from 'path'

import type { ScanWarning, SourceItem } from '../../shared/types'
import { parseFrontmatterFile } from './frontmatter'

export type OriginalsIndex = {
  originalsByAbsPath: Map<string, SourceItem>
  // Skill entries are typically referenced by their dir; we also index by the
  // skill's root path for symlink matching against skill directories.
  originalsBySkillRoot: Map<string, SourceItem>
  items: SourceItem[]
  warnings: ScanWarning[]
}

const EMPTY_INDEX: () => OriginalsIndex = () => ({
  originalsByAbsPath: new Map(),
  originalsBySkillRoot: new Map(),
  items: [],
  warnings: [],
})

async function safeReaddir(dir: string): Promise<string[] | null> {
  try {
    return await fs.readdir(dir)
  } catch {
    return null
  }
}

async function safeStat(p: string) {
  try {
    return await fs.stat(p)
  } catch {
    return null
  }
}

/**
 * Pick the entry markdown file for a skill directory:
 *   1. SKILL.md if present
 *   2. lexicographically first `*.md` otherwise
 *   3. null if no markdown found
 */
async function pickSkillEntry(skillDir: string): Promise<string | null> {
  const entries = await safeReaddir(skillDir)
  if (!entries) return null
  if (entries.includes('SKILL.md')) return 'SKILL.md'
  const mdEntries = entries.filter((e) => e.toLowerCase().endsWith('.md')).sort()
  return mdEntries[0] ?? null
}

export async function buildOriginalsIndex(originalsRoot: string | null): Promise<OriginalsIndex> {
  if (!originalsRoot) return EMPTY_INDEX()

  const rootStat = await safeStat(originalsRoot)
  if (!rootStat || !rootStat.isDirectory()) {
    return {
      ...EMPTY_INDEX(),
      warnings: [
        {
          kind: 'access',
          path: originalsRoot,
          message: `originalsRoot not found or not a directory: ${originalsRoot}`,
        },
      ],
    }
  }

  const index = EMPTY_INDEX()
  await Promise.all([
    enumerateCommands(originalsRoot, index),
    enumerateSkills(originalsRoot, index),
  ])
  return index
}

async function enumerateCommands(originalsRoot: string, index: OriginalsIndex): Promise<void> {
  const commandsDir = path.join(originalsRoot, 'commands')
  const entries = await safeReaddir(commandsDir)
  if (!entries) return

  await Promise.all(
    entries
      .filter((e) => e.toLowerCase().endsWith('.md'))
      .map(async (e) => {
        const absPath = path.join(commandsDir, e)
        const st = await safeStat(absPath)
        if (!st || !st.isFile()) return
        const parsed = await parseFrontmatterFile(absPath)
        const item: SourceItem = {
          kind: 'command',
          provenance: 'agents-hub',
          name: path.basename(e, path.extname(e)),
          description: parsed.description,
          absPath,
          frontmatter: parsed.frontmatter,
          frontmatterStatus: parsed.frontmatterStatus,
          bodyMarkdown: parsed.bodyMarkdown,
          symlinks: [],
        }
        if (parsed.frontmatterStatus === 'malformed') {
          index.warnings.push({
            kind: 'parse',
            path: absPath,
            message: parsed.error ?? 'malformed frontmatter',
          })
        }
        index.items.push(item)
        index.originalsByAbsPath.set(absPath, item)
      })
  )
}

async function enumerateSkills(originalsRoot: string, index: OriginalsIndex): Promise<void> {
  const skillsDir = path.join(originalsRoot, 'skills')
  const entries = await safeReaddir(skillsDir)
  if (!entries) return

  await Promise.all(
    entries
      .filter((e) => e !== '.omc')
      .map(async (e) => {
        const skillRootPath = path.join(skillsDir, e)
        const st = await safeStat(skillRootPath)
        if (!st || !st.isDirectory()) return

        const entryFile = await pickSkillEntry(skillRootPath)
        if (entryFile) {
          const entryAbs = path.join(skillRootPath, entryFile)
          const parsed = await parseFrontmatterFile(entryAbs)
          const item: SourceItem = {
            kind: 'skill',
            provenance: 'agents-hub',
            name: e,
            description: parsed.description,
            absPath: entryAbs,
            skillRootPath,
            entryFile,
            frontmatter: parsed.frontmatter,
            frontmatterStatus: parsed.frontmatterStatus,
            bodyMarkdown: parsed.bodyMarkdown,
            symlinks: [],
          }
          if (parsed.frontmatterStatus === 'malformed') {
            index.warnings.push({
              kind: 'parse',
              path: entryAbs,
              message: parsed.error ?? 'malformed frontmatter',
            })
          }
          index.items.push(item)
          index.originalsByAbsPath.set(entryAbs, item)
          index.originalsBySkillRoot.set(skillRootPath, item)
        } else {
          // Skill dir with no markdown — still emit a placeholder.
          const item: SourceItem = {
            kind: 'skill',
            provenance: 'agents-hub',
            name: e,
            absPath: skillRootPath,
            skillRootPath,
            frontmatter: {},
            frontmatterStatus: 'absent',
            bodyMarkdown: '',
            symlinks: [],
          }
          index.items.push(item)
          index.originalsBySkillRoot.set(skillRootPath, item)
        }
      })
  )
}
