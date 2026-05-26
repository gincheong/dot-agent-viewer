import { create } from 'zustand'

import type {
  AgentRoot,
  ScanResult,
  SourceItem,
} from '../../shared/types'

export type FilterChip = { key: string; value: string }

export type AppState = {
  sources: SourceItem[]
  agents: AgentRoot[]
  selectedAbsPath: string | null
  search: string
  filterChips: FilterChip[]
  scannedAt: number | null
}

export type AppActions = {
  select: (absPath: string | null) => void
  setSearch: (s: string) => void
  toggleChip: (key: string, value: string) => void
  replaceAll: (result: ScanResult) => void
}

export type AppStore = AppState & AppActions

const CLAUDE_ROOT: AgentRoot = { name: 'Claude', path: '/Users/evan/.claude' }
const GEMINI_ROOT: AgentRoot = { name: 'Gemini', path: '/Users/evan/.gemini' }

// Mock data — replaced by IPC-backed rescan in Phase D. Covers:
//  - agents-hub commands + skills (with symlinks to both Claude and Gemini)
//  - agent-local (~/.gemini/GEMINI.md as a regular file)
//  - external-link (target outside ~/.agents)
//  - description block-scalar (raw + collapsed oneLine)
//  - nested metadata object (depth-1 recursion case)
//  - 13-token allowed-tools comma list (>10 fallback case for chip generator)
//  - one broken symlink
const MOCK_SOURCES: SourceItem[] = [
  {
    kind: 'command',
    provenance: 'agents-hub',
    name: 'make-pr',
    description: {
      raw: 'Detect branch, summarize commits, create PR via gh CLI.',
      oneLine: 'Detect branch, summarize commits, create PR via gh CLI.',
    },
    absPath: '/Users/evan/.agents/commands/make-pr.md',
    frontmatter: {
      model: 'opus',
      description: 'Detect branch, summarize commits, create PR via gh CLI.',
      'allowed-tools': 'Bash, Read, Edit, Write',
    },
    frontmatterStatus: 'present',
    bodyMarkdown:
      '# make-pr\n\nDetects active branch and creates a pull request via the `gh` CLI.\n\n## Steps\n\n1. Run `git status` to see local changes.\n2. Summarize commits since the base branch.\n3. Invoke `gh pr create` with a generated title and body.\n\n> Tip: use the template under `.github/pull_request_template.md` when present.\n',
    symlinks: [
      {
        linkPath: '/Users/evan/.claude/commands/make-pr.md',
        agentRoot: CLAUDE_ROOT,
        broken: false,
        targetPath: '/Users/evan/.agents/commands/make-pr.md',
      },
      {
        linkPath: '/Users/evan/.gemini/make-pr.md',
        agentRoot: GEMINI_ROOT,
        broken: false,
        targetPath: '/Users/evan/.agents/commands/make-pr.md',
      },
    ],
  },
  {
    kind: 'command',
    provenance: 'agents-hub',
    name: 'code-admin-with-jira',
    description: {
      raw: 'Jira issue key or URL → context → code work → suggested commit message',
      oneLine:
        'Jira issue key or URL → context → code work → suggested commit message',
    },
    absPath: '/Users/evan/.agents/commands/code-admin-with-jira.md',
    frontmatter: {
      model: 'opus',
      description:
        'Jira issue key or URL → context → code work → suggested commit message',
      // 13-token comma list — exceeds the chip generator cap (>10) so it falls back
      // to "Show full" text behaviour in the table.
      'allowed-tools':
        'Bash, Read, Edit, Write, Glob, Grep, WebFetch, mcp__jira, mcp__playwright, mcp__figma, NotebookEdit, TodoWrite, SendUserFile',
    },
    frontmatterStatus: 'present',
    bodyMarkdown:
      '# code-admin-with-jira\n\nGather Jira context, perform code work, and surface a recommended commit body. Never pushes.\n',
    symlinks: [
      {
        linkPath: '/Users/evan/.claude/commands/code-admin-with-jira.md',
        agentRoot: CLAUDE_ROOT,
        broken: false,
        targetPath: '/Users/evan/.agents/commands/code-admin-with-jira.md',
      },
    ],
  },
  {
    kind: 'skill',
    provenance: 'agents-hub',
    name: 'gh-stack',
    description: {
      // Raw block-scalar style from the wild. `oneLine` collapses newlines and
      // trims runs of whitespace so the sidebar renders a single tight string.
      raw: 'Manage stacked branches and pull requests with gh-stack.\nTriggers on stacked diffs, dependent PRs, branch chains.\n',
      oneLine:
        'Manage stacked branches and pull requests with gh-stack. Triggers on stacked diffs, dependent PRs, branch chains.',
    },
    absPath: '/Users/evan/.agents/skills/gh-stack/SKILL.md',
    skillRootPath: '/Users/evan/.agents/skills/gh-stack',
    entryFile: 'SKILL.md',
    frontmatter: {
      name: 'gh-stack',
      description:
        'Manage stacked branches and pull requests with gh-stack.\nTriggers on stacked diffs, dependent PRs, branch chains.\n',
      // Nested object — exercises FrontmatterTable depth-1 recursion.
      metadata: {
        author: 'evan',
        version: '0.4.2',
        'github-url': 'https://github.com/example/gh-stack',
      },
      tags: ['git', 'github', 'workflow'],
    },
    frontmatterStatus: 'present',
    bodyMarkdown:
      '# gh-stack\n\nStacked-diff workflow helpers built on the `gh` CLI.\n\n## Capabilities\n\n- Create dependent PR chains\n- Rebase a stack\n- Navigate up/down the stack\n\n```bash\ngh stack new\ngh stack push\n```\n',
    symlinks: [
      {
        linkPath: '/Users/evan/.claude/skills/gh-stack',
        agentRoot: CLAUDE_ROOT,
        broken: false,
        targetPath: '/Users/evan/.agents/skills/gh-stack',
      },
      {
        linkPath: '/Users/evan/.gemini/antigravity/skills/gh-stack',
        agentRoot: GEMINI_ROOT,
        broken: false,
        targetPath: '/Users/evan/.agents/skills/gh-stack',
      },
    ],
  },
  // Broken symlink: target deleted between scans.
  {
    kind: 'command',
    provenance: 'agents-hub',
    name: 'orphan-command',
    description: {
      raw: 'A hub original whose Claude symlink target was moved.',
      oneLine: 'A hub original whose Claude symlink target was moved.',
    },
    absPath: '/Users/evan/.agents/commands/orphan-command.md',
    frontmatter: {
      model: 'sonnet',
      description: 'A hub original whose Claude symlink target was moved.',
    },
    frontmatterStatus: 'present',
    bodyMarkdown: '# orphan-command\n\nDemonstrates a broken symlink row.\n',
    symlinks: [
      {
        linkPath: '/Users/evan/.claude/commands/orphan-command.md',
        agentRoot: CLAUDE_ROOT,
        broken: true,
        targetPath: '/Users/evan/.agents/commands/orphan-command.md',
      },
    ],
  },
  // Agent-local: ~/.gemini/GEMINI.md as a regular file (not a symlink). No
  // hub counterpart, no inbound symlinks. Demonstrates the `missing`-status row.
  {
    kind: 'command',
    provenance: 'agent-local',
    name: 'GEMINI',
    description: {
      raw: 'Top-level Gemini instructions for this user. Not a symlink.',
      oneLine: 'Top-level Gemini instructions for this user. Not a symlink.',
    },
    absPath: '/Users/evan/.gemini/GEMINI.md',
    frontmatter: {
      status: 'missing',
      description: 'Top-level Gemini instructions for this user. Not a symlink.',
    },
    frontmatterStatus: 'present',
    bodyMarkdown:
      '# GEMINI.md\n\nThis file lives only inside `~/.gemini/`. It has no counterpart in `~/.agents/` and is therefore surfaced under the **agent-local files** bucket.\n',
    symlinks: [],
    ownerAgentRoot: GEMINI_ROOT,
  },
  // External-link: symlink in ~/.claude/commands pointing OUTSIDE ~/.agents.
  {
    kind: 'command',
    provenance: 'external-link',
    name: 'sibling-worktree',
    description: {
      raw: 'A command sourced from a sibling worktree outside ~/.agents.',
      oneLine:
        'A command sourced from a sibling worktree outside ~/.agents.',
    },
    absPath: '/Users/evan/.claude/commands/sibling-worktree.md',
    frontmatter: {
      model: 'sonnet',
      description:
        'A command sourced from a sibling worktree outside ~/.agents.',
    },
    frontmatterStatus: 'present',
    bodyMarkdown:
      '# sibling-worktree\n\nSourced via symlink from `/tmp/foo.md`.\n',
    symlinks: [],
    ownerAgentRoot: CLAUDE_ROOT,
    externalTargetPath: '/tmp/foo.md',
  },
]

export const useAppStore = create<AppStore>((set) => ({
  // state
  sources: MOCK_SOURCES,
  agents: [CLAUDE_ROOT, GEMINI_ROOT],
  selectedAbsPath: MOCK_SOURCES[0]?.absPath ?? null,
  search: '',
  filterChips: [],
  scannedAt: Date.now(),

  // actions
  select: (absPath) => set({ selectedAbsPath: absPath }),
  setSearch: (s) => set({ search: s }),
  toggleChip: (key, value) =>
    set((state) => {
      const exists = state.filterChips.some(
        (c) => c.key === key && c.value === value,
      )
      const next = exists
        ? state.filterChips.filter(
            (c) => !(c.key === key && c.value === value),
          )
        : [...state.filterChips, { key, value }]
      return { filterChips: next }
    }),
  replaceAll: (result) =>
    set({
      sources: result.sources,
      agents: result.agents,
      scannedAt: result.scannedAt,
    }),
}))
