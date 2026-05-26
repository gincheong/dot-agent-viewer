import path from 'node:path'

import { _electron as electron, test as base, expect } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'

import type {
  AgentRoot,
  ScanResult,
  SourceItem,
} from '../../src/shared/types'

/**
 * A deterministic ScanResult covering all three provenance buckets. The store's
 * `rescan()` short-circuits onto `window.__testScanResult` when present, so e2e
 * specs run against this fixture rather than the real `~/.agents` tree.
 */
export function buildFixtureScanResult(): ScanResult {
  const CLAUDE_ROOT: AgentRoot = { name: 'Claude', path: '/tmp/.claude' }
  const GEMINI_ROOT: AgentRoot = { name: 'Gemini', path: '/tmp/.gemini' }

  const sources: SourceItem[] = [
    {
      kind: 'command',
      provenance: 'agents-hub',
      name: 'make-pr',
      description: {
        raw: 'Detect branch, summarize commits, create PR via gh CLI.',
        oneLine: 'Detect branch, summarize commits, create PR via gh CLI.',
      },
      absPath: '/tmp/.agents/commands/make-pr.md',
      frontmatter: {
        model: 'opus',
        description: 'Detect branch, summarize commits, create PR via gh CLI.',
        'allowed-tools': 'Bash, Read, Edit, Write',
      },
      frontmatterStatus: 'present',
      bodyMarkdown: '# make-pr\n\nFixture body for the make-pr command.\n',
      symlinks: [
        {
          linkPath: '/tmp/.claude/commands/make-pr.md',
          agentRoot: CLAUDE_ROOT,
          broken: false,
          targetPath: '/tmp/.agents/commands/make-pr.md',
        },
      ],
    },
    {
      kind: 'command',
      provenance: 'agents-hub',
      name: 'release',
      description: {
        raw: 'Generic release assistant.',
        oneLine: 'Generic release assistant.',
      },
      absPath: '/tmp/.agents/commands/release.md',
      frontmatter: {
        model: 'sonnet',
        description: 'Generic release assistant.',
      },
      frontmatterStatus: 'present',
      bodyMarkdown: '# release\n\nFixture body for release.\n',
      symlinks: [],
    },
    {
      kind: 'skill',
      provenance: 'agents-hub',
      name: 'gh-stack',
      description: {
        raw: 'Manage stacked branches and PRs.',
        oneLine: 'Manage stacked branches and PRs.',
      },
      absPath: '/tmp/.agents/skills/gh-stack/SKILL.md',
      skillRootPath: '/tmp/.agents/skills/gh-stack',
      entryFile: 'SKILL.md',
      frontmatter: {
        name: 'gh-stack',
        description: 'Manage stacked branches and PRs.',
        metadata: {
          author: 'evan',
          version: '0.4.2',
        },
      },
      frontmatterStatus: 'present',
      bodyMarkdown:
        '# gh-stack\n\nFixture body for the gh-stack skill.\n',
      symlinks: [
        {
          linkPath: '/tmp/.claude/skills/gh-stack',
          agentRoot: CLAUDE_ROOT,
          broken: false,
          targetPath: '/tmp/.agents/skills/gh-stack',
        },
        {
          linkPath: '/tmp/.gemini/antigravity/skills/gh-stack',
          agentRoot: GEMINI_ROOT,
          broken: false,
          targetPath: '/tmp/.agents/skills/gh-stack',
        },
      ],
    },
    {
      kind: 'command',
      provenance: 'agent-local',
      name: 'GEMINI',
      description: {
        raw: 'Top-level Gemini instructions.',
        oneLine: 'Top-level Gemini instructions.',
      },
      absPath: '/tmp/.gemini/GEMINI.md',
      frontmatter: { description: 'Top-level Gemini instructions.' },
      frontmatterStatus: 'present',
      bodyMarkdown: '# GEMINI.md\n\nFixture body for GEMINI.md.\n',
      symlinks: [],
      ownerAgentRoot: GEMINI_ROOT,
    },
  ]

  return {
    sources,
    agents: [CLAUDE_ROOT, GEMINI_ROOT],
    originalsRoot: '/tmp/.agents',
    scannedAt: Date.now(),
    warnings: [],
  }
}

type Fixtures = {
  electronApp: ElectronApplication
  firstWindow: Page
}

/**
 * Playwright test extended with an Electron app launch + a `window.__testScanResult`
 * injection so the renderer boots against the fixture rather than the host FS.
 */
export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    const mainEntry = path.join(__dirname, '../../out/main/index.js')
    const app = await electron.launch({
      args: [mainEntry],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })
    await use(app)
    await app.close()
  },
  firstWindow: async ({ electronApp }, use) => {
    const win = await electronApp.firstWindow()
    // Register an init script that runs BEFORE every navigation, then reload
    // so the renderer's mount-time `rescan()` sees `window.__testScanResult`
    // and short-circuits onto the deterministic fixture.
    const fixture = buildFixtureScanResult()
    await win.addInitScript((serialized: string) => {
      ;(window as unknown as { __testScanResult: unknown }).__testScanResult =
        JSON.parse(serialized)
    }, JSON.stringify(fixture))
    await win.reload()
    // Wait until React has mounted and rendered at least one source item from
    // the fixture before handing the page to the spec.
    await win.waitForSelector('.source-item__name', { timeout: 10_000 })
    await use(win)
  },
})

export { expect }
