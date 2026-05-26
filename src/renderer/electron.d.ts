// Ambient declaration for the preload-exposed `window.dotAgent` API.
// Renderer code uses this namespace; the actual values are injected by the
// preload bundle at runtime.
//
// Types are inlined (not imported from src/preload) so the renderer tsconfig
// doesn't need to include the preload tree.

import type {
  ConfigGetRootsResponse,
  ScannerRescanResponse,
  ScannerStatusResponse,
} from '../shared/ipc'

export type DotAgentApi = {
  rescan: () => Promise<ScannerRescanResponse>
  getStatus: () => Promise<ScannerStatusResponse>
  getRoots: () => Promise<ConfigGetRootsResponse>
}

declare global {
  interface Window {
    dotAgent: DotAgentApi
  }
}

export {}
