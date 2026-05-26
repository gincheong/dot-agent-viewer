// Playwright-only helper: installs in-memory spy `ActionHandlers` into the
// running Electron main process so action specs can assert on calls without
// triggering real `$EDITOR` spawns or clipboard writes.
//
// This file lives under `tests/**` and is NEVER imported by the bundled main,
// preload, or renderer; it only runs from the Playwright test runner.

import type { ElectronApplication } from '@playwright/test'

export type SpyCall =
  | { name: 'openEditor'; absPath: string }
  | { name: 'copyPath'; absPath: string }
  | { name: 'copyBody'; body: string }

/**
 * Replaces the registry's default handlers with spies that record calls into
 * `globalThis.__dotAgentSpyCalls` (within the main process). Returns a helper
 * to read those calls back via `electronApp.evaluate`.
 *
 * Requires the app to be launched with `NODE_ENV=test` — `installDefaultHandlers`
 * only exposes `__dotAgentTest.setHandlers` on the main-process globalThis
 * when that env is set.
 */
export async function installActionSpies(
  electronApp: ElectronApplication,
): Promise<{
  getCalls: () => Promise<SpyCall[]>
  reset: () => Promise<void>
}> {
  await electronApp.evaluate(() => {
    type SpyCall =
      | { name: 'openEditor'; absPath: string }
      | { name: 'copyPath'; absPath: string }
      | { name: 'copyBody'; body: string }
    type TestGlobals = {
      __dotAgentTest?: {
        setHandlers: (h: {
          openEditor: (
            p: string,
          ) => Promise<{ ok: true } | { ok: false; reason: string }>
          copyPath: (p: string) => Promise<{ ok: true }>
          copyBody: (b: string) => Promise<{ ok: true }>
        }) => void
      }
      __dotAgentSpyCalls?: SpyCall[]
    }
    const g = globalThis as unknown as TestGlobals
    g.__dotAgentSpyCalls = []
    const hook = g.__dotAgentTest
    if (!hook) {
      throw new Error(
        '__dotAgentTest hook missing — was the app launched with NODE_ENV=test?',
      )
    }
    hook.setHandlers({
      openEditor: async (absPath: string) => {
        g.__dotAgentSpyCalls!.push({ name: 'openEditor', absPath })
        return { ok: true } as const
      },
      copyPath: async (absPath: string) => {
        g.__dotAgentSpyCalls!.push({ name: 'copyPath', absPath })
        return { ok: true } as const
      },
      copyBody: async (body: string) => {
        g.__dotAgentSpyCalls!.push({ name: 'copyBody', body })
        return { ok: true } as const
      },
    })
  })

  return {
    getCalls: async () =>
      electronApp.evaluate(() => {
        type SpyCall =
          | { name: 'openEditor'; absPath: string }
          | { name: 'copyPath'; absPath: string }
          | { name: 'copyBody'; body: string }
        const g = globalThis as unknown as { __dotAgentSpyCalls?: SpyCall[] }
        return g.__dotAgentSpyCalls ?? []
      }),
    reset: async () => {
      await electronApp.evaluate(() => {
        const g = globalThis as unknown as { __dotAgentSpyCalls?: unknown[] }
        g.__dotAgentSpyCalls = []
      })
    },
  }
}
