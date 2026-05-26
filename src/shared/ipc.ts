// IPC channel name constants + request/response payload types.
// See plan §2 for the channel map.

import type { AgentRootConfig, ScanResult } from './types'

export const IPC = {
  SCANNER_RESCAN: 'scanner:rescan',
  SCANNER_STATUS: 'scanner:status',
  CONFIG_GET_ROOTS: 'config:get-roots',
  ACTION_OPEN_EDITOR: 'action:open-editor',
  ACTION_COPY_PATH: 'action:copy-path',
  ACTION_COPY_BODY: 'action:copy-body',
  SYSTEM_APPEARANCE: 'system:appearance',
} as const

export type ScannerRescanRequest = { extraRootsPath?: string }
export type ScannerRescanResponse = ScanResult

export type ScannerStatusRequest = void
export type ScannerStatusResponse = {
  scanning: boolean
  lastScannedAt: number | null
  lastError?: string
}

export type ConfigGetRootsRequest = void
export type ConfigGetRootsResponse = {
  roots: AgentRootConfig[]
  configPath: string
}

export type ActionOpenEditorRequest = { absPath: string }
export type ActionOpenEditorResponse =
  | { ok: true }
  | { ok: false; reason: string }

export type ActionCopyPathRequest = { absPath: string }
export type ActionCopyPathResponse = { ok: true }

export type ActionCopyBodyRequest = { body: string }
export type ActionCopyBodyResponse = { ok: true }

export type SystemAppearanceRequest = void
export type SystemAppearanceResponse = { theme: 'light' | 'dark' }

// Aggregate channel→payload map used for type-safe IPC handlers/clients.
export type IpcChannels = {
  [IPC.SCANNER_RESCAN]: {
    req: ScannerRescanRequest
    res: ScannerRescanResponse
  }
  [IPC.SCANNER_STATUS]: {
    req: ScannerStatusRequest
    res: ScannerStatusResponse
  }
  [IPC.CONFIG_GET_ROOTS]: {
    req: ConfigGetRootsRequest
    res: ConfigGetRootsResponse
  }
  [IPC.ACTION_OPEN_EDITOR]: {
    req: ActionOpenEditorRequest
    res: ActionOpenEditorResponse
  }
  [IPC.ACTION_COPY_PATH]: {
    req: ActionCopyPathRequest
    res: ActionCopyPathResponse
  }
  [IPC.ACTION_COPY_BODY]: {
    req: ActionCopyBodyRequest
    res: ActionCopyBodyResponse
  }
  [IPC.SYSTEM_APPEARANCE]: {
    req: SystemAppearanceRequest
    res: SystemAppearanceResponse
  }
}
