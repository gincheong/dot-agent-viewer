// Renderer global type augmentations.
//
//  - `window.dotAgent` is exposed by the preload via contextBridge.
//  - `window.__testScanResult` is injected by Playwright's `addInitScript`
//    to bypass IPC and seed deterministic scan data into the store during
//    e2e tests. Production never sets this.

import type { DotAgentApi } from '../preload/index'
import type { ScanResult } from '../shared/types'

declare global {
  interface Window {
    dotAgent?: DotAgentApi
    __testScanResult?: ScanResult
  }
}

export {}
