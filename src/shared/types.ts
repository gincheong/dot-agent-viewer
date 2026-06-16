// Core data model for dot-agent-viewer. See plan §3.

export type AgentRoot = {
  name: string // 'Claude' | 'Gemini' | user-defined
  path: string // absolute, e.g. /Users/evan/.claude
}

export type AgentRootScope = {
  glob: string // e.g. 'commands/**/*.md', 'skills/*', '**/*.md'
  kind: 'command' | 'skill' | 'any'
}

export type AgentRootConfig = AgentRoot & {
  scopes: AgentRootScope[]
}

export type SourceKind = 'command' | 'skill'

export type FrontmatterStatus = 'present' | 'absent' | 'malformed'

/**
 * Provenance describes where a SourceItem actually lives and how it relates
 * to the configured originalsRoot (default ~/.agents):
 *  - 'agents-hub'    : the canonical original under originalsRoot itself.
 *  - 'agent-local'   : a regular, non-symlinked file/dir inside an agent root
 *                      (e.g. ~/.gemini/GEMINI.md). It has no hub counterpart.
 *  - 'external-link' : a symlink inside an agent root whose target resolves
 *                      OUTSIDE originalsRoot (e.g. sibling worktree).
 */
export type Provenance = 'agents-hub' | 'agent-local' | 'external-link'

export type Description = {
  raw: unknown // original frontmatter value (string | object | array | …)
  oneLine: string // normalized: block scalars collapsed, trimmed, ≤140 chars
}

export type SymlinkRef = {
  linkPath: string // absolute path of the symlink itself
  agentRoot: AgentRoot // which configured root owns this link
  broken: boolean // target does not exist
  targetPath: string // readlink result, resolved to absolute
}

export type SourceItem = {
  kind: SourceKind
  provenance: Provenance
  name: string // file stem for commands; dir name for skills
  description?: Description // normalized from frontmatter.description (any shape)
  absPath: string // absolute path to the file we parsed
  skillRootPath?: string // only when kind==='skill': dir path
  entryFile?: string // for skills: 'SKILL.md' or fallback filename
  frontmatter: Record<string, unknown>
  frontmatterStatus: FrontmatterStatus
  bodyMarkdown: string // empty string if absent
  symlinks: SymlinkRef[] // populated for 'agents-hub' items
  // For 'agent-local' and 'external-link' items, where the item lives:
  ownerAgentRoot?: AgentRoot
  externalTargetPath?: string // only for 'external-link'
  broken?: boolean // only for 'external-link' when target missing
}

export type ScanWarning = {
  kind: 'parse' | 'access'
  path: string
  message: string
}

export type ScanResult = {
  sources: SourceItem[]
  agents: AgentRoot[]
  originalsRoot: string // absolute path actually used (empty string if disabled)
  scannedAt: number // epoch ms
  warnings: ScanWarning[]
}

export type PluginScope = 'user' | 'project'

export type PluginItem = {
  kind: SourceKind
  name: string
  pluginId: string // e.g. 'oh-my-claudecode@omc'
  absPath: string
  skillRootPath?: string
  entryFile?: string
  frontmatter: Record<string, unknown>
  frontmatterStatus: FrontmatterStatus
  bodyMarkdown: string
  description?: Description
}

export type PluginEntry = {
  id: string // e.g. 'oh-my-claudecode@omc'
  name: string // e.g. 'oh-my-claudecode'
  marketplace: string // e.g. 'omc'
  version: string
  scope: PluginScope
  projectPath?: string // only for project-scoped installs
  installPath: string
  items: PluginItem[]
}

export type PluginsResult = {
  plugins: PluginEntry[]
}

export type UserConfig = {
  originalsRoot: string | null // absolute; null disables hub-grouping
  roots: AgentRootConfig[]
  mergeStrategy: 'append' | 'replace'
}
