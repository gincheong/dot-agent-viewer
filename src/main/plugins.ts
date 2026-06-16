import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'

import type { PluginEntry, PluginItem, PluginScope } from '../shared/types'
import { parseFrontmatterFile } from './scanner/frontmatter'

const PLUGINS_JSON = path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json')

type RawInstall = {
  scope: PluginScope
  installPath: string
  version: string
  projectPath?: string
}

type RawPluginsJson = {
  version: number
  plugins: Record<string, RawInstall[]>
}

async function scanPluginItems(installPath: string, pluginId: string): Promise<PluginItem[]> {
  const items: PluginItem[] = []

  const commandsDir = path.join(installPath, 'commands')
  try {
    const entries = await fs.readdir(commandsDir)
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue
      const absPath = path.join(commandsDir, entry)
      const parsed = await parseFrontmatterFile(absPath)
      items.push({
        kind: 'command',
        name: entry.replace(/\.md$/, ''),
        pluginId,
        absPath,
        frontmatter: parsed.frontmatter,
        frontmatterStatus: parsed.frontmatterStatus,
        bodyMarkdown: parsed.bodyMarkdown,
        description: parsed.description,
      })
    }
  } catch {
    // commands/ absent — skip
  }

  const skillsDir = path.join(installPath, 'skills')
  try {
    const entries = await fs.readdir(skillsDir)
    for (const entry of entries) {
      const skillRoot = path.join(skillsDir, entry)
      const stat = await fs.lstat(skillRoot).catch(() => null)
      if (!stat?.isDirectory()) continue

      let entryFile: string
      let absPath: string
      const skillMd = path.join(skillRoot, 'SKILL.md')
      try {
        await fs.access(skillMd)
        entryFile = 'SKILL.md'
        absPath = skillMd
      } catch {
        const files = await fs.readdir(skillRoot).catch(() => [] as string[])
        const md = files.find((f) => f.endsWith('.md'))
        if (!md) continue
        entryFile = md
        absPath = path.join(skillRoot, md)
      }

      const parsed = await parseFrontmatterFile(absPath)
      items.push({
        kind: 'skill',
        name: entry,
        pluginId,
        absPath,
        skillRootPath: skillRoot,
        entryFile,
        frontmatter: parsed.frontmatter,
        frontmatterStatus: parsed.frontmatterStatus,
        bodyMarkdown: parsed.bodyMarkdown,
        description: parsed.description,
      })
    }
  } catch {
    // skills/ absent — skip
  }

  return items
}

export async function listPlugins(): Promise<{ plugins: PluginEntry[] }> {
  let raw: RawPluginsJson | null = null
  try {
    const content = await fs.readFile(PLUGINS_JSON, 'utf8')
    raw = JSON.parse(content) as RawPluginsJson
  } catch {
    return { plugins: [] }
  }

  if (!raw?.plugins) return { plugins: [] }

  const result: PluginEntry[] = []
  const seen = new Set<string>()

  for (const [pluginId, installs] of Object.entries(raw.plugins)) {
    const atIdx = pluginId.lastIndexOf('@')
    const marketplace = atIdx >= 0 ? pluginId.slice(atIdx + 1) : 'unknown'
    const name = atIdx >= 0 ? pluginId.slice(0, atIdx) : pluginId

    for (const install of installs) {
      if (seen.has(install.installPath)) continue
      seen.add(install.installPath)

      const items = await scanPluginItems(install.installPath, pluginId)
      result.push({
        id: pluginId,
        name,
        marketplace,
        version: install.version,
        scope: install.scope,
        projectPath: install.projectPath,
        installPath: install.installPath,
        items,
      })
    }
  }

  return { plugins: result }
}
