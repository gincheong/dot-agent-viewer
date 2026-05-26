// Action handler registry.
//
// Indirection point that lets Playwright swap real handlers for in-memory spies
// from `tests/e2e/preload-spies.ts` via `electronApp.evaluate(...)`.
// Production code never short-circuits on env flags — the indirection is the
// single mechanism for test-mode injection. See plan §7.

export type ActionHandlers = {
  openEditor: (
    absPath: string,
  ) => Promise<{ ok: true } | { ok: false; reason: string }>
  copyPath: (absPath: string) => Promise<{ ok: true }>
  copyBody: (body: string) => Promise<{ ok: true }>
}

let current: ActionHandlers | null = null

export function setHandlers(h: ActionHandlers): void {
  current = h
}

export function getHandlers(): ActionHandlers {
  if (!current) {
    throw new Error('actions not initialized')
  }
  return current
}
