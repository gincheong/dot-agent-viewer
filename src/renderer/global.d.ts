// Renderer global type augmentations.
//
//  - `window.dotAgent` is declared in `electron.d.ts` (renderer-local ambient).
//  - `window.__testScanResult` is injected by Playwright's `addInitScript`
//    to bypass IPC and seed deterministic scan data into the store during
//    e2e tests. Production never sets this.

import type { ScanResult } from '../shared/types'

declare global {
  interface Window {
    __testScanResult?: ScanResult
  }
}

export {}
