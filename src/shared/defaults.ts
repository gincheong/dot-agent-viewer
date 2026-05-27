// Default config values. See plan §3.
//
// `~` is expanded via os.homedir() — values exported here are absolute paths.

import os from 'os'
import path from 'path'

import type { AgentRootConfig, UserConfig } from './types'

function expandHome(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

export { expandHome }

export const DEFAULT_ORIGINALS_ROOT = expandHome('~/.agents')

export const DEFAULT_AGENT_ROOTS: AgentRootConfig[] = [
  {
    name: 'Claude',
    path: expandHome('~/.claude'),
    scopes: [
      { glob: 'commands/**/*.md', kind: 'command' },
      { glob: 'skills/*', kind: 'skill' },
    ],
  },
  {
    name: 'Gemini',
    path: expandHome('~/.gemini'),
    scopes: [
      { glob: '**/*.md', kind: 'any' },
      { glob: 'antigravity/skills/*', kind: 'skill' },
    ],
  },
  {
    name: 'Cursor',
    path: expandHome('~/.cursor'),
    scopes: [{ glob: 'skills/*', kind: 'skill' }],
  },
  {
    name: 'Codex',
    path: expandHome('~/.codex'),
    scopes: [{ glob: 'skills/*', kind: 'skill' }],
  },
]

export const DEFAULT_USER_CONFIG: UserConfig = {
  originalsRoot: DEFAULT_ORIGINALS_ROOT,
  roots: DEFAULT_AGENT_ROOTS,
  mergeStrategy: 'append',
}

export const DEFAULT_CONFIG_PATH = expandHome('~/.config/dot-agent-viewer/config.json')
