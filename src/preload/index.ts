// Renderer-facing bridge. Exposes a typed `window.dotAgent` API backed by
// invoke/handle IPC plus a small pub/sub surface for one-way events.

import { contextBridge, ipcRenderer } from 'electron'

import { EVENTS, IPC } from '../shared/ipc'
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

const api: DotAgentApi = {
  rescan: () => ipcRenderer.invoke(IPC.SCANNER_RESCAN),
  getStatus: () => ipcRenderer.invoke(IPC.SCANNER_STATUS),
  getRoots: () => ipcRenderer.invoke(IPC.CONFIG_GET_ROOTS),
  openEditor: (absPath) => ipcRenderer.invoke(IPC.ACTION_OPEN_EDITOR, { absPath }),
  copyPath: (absPath) => ipcRenderer.invoke(IPC.ACTION_COPY_PATH, { absPath }),
  copyBody: (body) => ipcRenderer.invoke(IPC.ACTION_COPY_BODY, { body }),
  getAppearance: () => ipcRenderer.invoke(IPC.SYSTEM_APPEARANCE),
  onAppearanceChanged: (cb) => {
    const listener = (
      _e: Electron.IpcRendererEvent,
      payload: SystemAppearanceChangedEvent,
    ): void => cb(payload)
    ipcRenderer.on(EVENTS.SYSTEM_APPEARANCE_CHANGED, listener)
    return () => {
      ipcRenderer.removeListener(EVENTS.SYSTEM_APPEARANCE_CHANGED, listener)
    }
  },
  onRescanRequest: (cb) => {
    const listener = (): void => cb()
    ipcRenderer.on(EVENTS.APP_RESCAN_REQUEST, listener)
    return () => {
      ipcRenderer.removeListener(EVENTS.APP_RESCAN_REQUEST, listener)
    }
  },
}

contextBridge.exposeInMainWorld('dotAgent', api)
