// Action bootstrap — installs default handlers into the registry.
//
// Called once from `app.whenReady()` in main/index.ts before IPC handlers run.
// Playwright tests override defaults via `electronApp.evaluate(...)` which
// runs inside the main process. The bundled main file has no module export
// surface accessible by file path, so we expose the registry's `setHandlers`
// on `globalThis.__dotAgentTest` *only when NODE_ENV === 'test'* — keeping the
// hook out of production binaries.

import { copyBodyHandler, copyPathHandler } from './clipboard'
import { openEditorHandler } from './openEditor'
import { setHandlers } from './registry'
import type { ActionHandlers } from './registry'

export function installDefaultHandlers(): void {
  setHandlers({
    openEditor: openEditorHandler,
    copyPath: copyPathHandler,
    copyBody: copyBodyHandler,
  })
  if (process.env.NODE_ENV === 'test') {
    // Expose the registry mutator so Playwright's `electronApp.evaluate()`
    // can install spies. The runtime guard ensures this never appears in
    // production bundles' runtime behavior (tree-shaking won't remove the
    // check, but the spy globals never materialize without NODE_ENV=test).
    ;(globalThis as unknown as TestGlobals).__dotAgentTest = {
      setHandlers,
    }
  }
}

type TestGlobals = {
  __dotAgentTest?: {
    setHandlers: (h: ActionHandlers) => void
  }
}

export { setHandlers, getHandlers } from './registry'
export type { ActionHandlers } from './registry'
