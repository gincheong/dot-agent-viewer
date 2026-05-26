// Ambient declaration for the preload-exposed `window.dotAgent` API.
// Renderer code uses this namespace; the actual values are injected by the
// preload bundle at runtime.
//
// Types are inlined (not imported from src/preload) so the renderer tsconfig
// doesn't need to include the preload tree.

import type {
  ActionCopyBodyResponse,
  ActionCopyPathResponse,
  ActionOpenEditorResponse,
  ConfigGetRootsResponse,
  ScannerRescanResponse,
  ScannerStatusResponse,
  SystemAppearanceChangedEvent,
  SystemAppearanceResponse,
} from '../shared/ipc'

export type UnsubscribeFn = () => void

export type DotAgentApi = {
  rescan: () => Promise<ScannerRescanResponse>
  getStatus: () => Promise<ScannerStatusResponse>
  getRoots: () => Promise<ConfigGetRootsResponse>
  openEditor: (absPath: string) => Promise<ActionOpenEditorResponse>
  copyPath: (absPath: string) => Promise<ActionCopyPathResponse>
  copyBody: (body: string) => Promise<ActionCopyBodyResponse>
  getAppearance: () => Promise<SystemAppearanceResponse>
  onAppearanceChanged: (
    cb: (payload: SystemAppearanceChangedEvent) => void,
  ) => UnsubscribeFn
  onRescanRequest: (cb: () => void) => UnsubscribeFn
}

declare global {
  interface Window {
    // Optional at the type level — jsdom unit tests and headless contexts run
    // without the preload bridge. Renderer code defends with truthy checks.
    dotAgent?: DotAgentApi
  }
}

export {}
