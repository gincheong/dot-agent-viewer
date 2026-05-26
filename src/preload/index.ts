// Renderer-facing bridge. Exposes a typed `window.dotAgent` API backed by
// invoke/handle IPC.

import { contextBridge, ipcRenderer } from 'electron'

import { IPC } from '../shared/ipc'
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

const api: DotAgentApi = {
  rescan: () => ipcRenderer.invoke(IPC.SCANNER_RESCAN),
  getStatus: () => ipcRenderer.invoke(IPC.SCANNER_STATUS),
  getRoots: () => ipcRenderer.invoke(IPC.CONFIG_GET_ROOTS),
}

contextBridge.exposeInMainWorld('dotAgent', api)
