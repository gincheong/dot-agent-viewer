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
  loading: boolean
  error: string | null
}

export type AppActions = {
  select: (absPath: string | null) => void
  setSearch: (s: string) => void
  toggleChip: (key: string, value: string) => void
  replaceAll: (result: ScanResult) => void
  rescan: () => Promise<void>
}

export type AppStore = AppState & AppActions

const CLAUDE_ROOT: AgentRoot = { name: 'Claude', path: '/Users/evan/.claude' }
const GEMINI_ROOT: AgentRoot = { name: 'Gemini', path: '/Users/evan/.gemini' }

// Mock fixture preserved for unit tests (store + component tests can import
// this directly to seed deterministic data). Phase D moved the runtime data
// path onto IPC (`window.dotAgent.rescan()`); this export is test-only.
export const __mockSourcesForTests: SourceItem[] = [
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

export const useAppStore = create<AppStore>((set, get) => ({
  // state — empty initial; populated by `rescan()` from App.tsx mount.
  sources: [],
  agents: [],
  selectedAbsPath: null,
  search: '',
  filterChips: [],
  scannedAt: null,
  loading: false,
  error: null,

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
  rescan: async () => {
    // Test-mode short-circuit: Playwright's `addInitScript` injects a known
    // ScanResult onto `window.__testScanResult` to bypass IPC. Check this
    // FIRST so the IPC path is never touched in e2e fixtures.
    //
    // We re-stamp `scannedAt: Date.now()` on every test-mode rescan so the
    // staleness flow ("⌘R resets the pill") works under Playwright's fake
    // clock — the fixture's static timestamp would never reset otherwise.
    if (typeof window !== 'undefined' && window.__testScanResult) {
      const fixture = window.__testScanResult
      set({
        sources: fixture.sources,
        agents: fixture.agents,
        scannedAt: Date.now(),
        loading: false,
        error: null,
      })
      return
    }

    // Production / dev: real IPC via the contextBridge.
    if (typeof window === 'undefined' || !window.dotAgent) {
      // jsdom unit tests reach this branch; no-op cleanly.
      return
    }

    if (get().loading) return
    set({ loading: true, error: null })
    try {
      const result = await window.dotAgent.rescan()
      set({
        sources: result.sources,
        agents: result.agents,
        scannedAt: result.scannedAt,
        loading: false,
        error: null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      set({ loading: false, error: message })
    }
  },
}))
