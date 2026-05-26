// IPC handler registration for scanner + config + action + appearance channels.
// Phase B exposed scanner / config; Phase E adds action:* + system:appearance
// (invoke/handle) plus system:appearance-changed broadcast (send to renderer).

import { BrowserWindow, ipcMain, nativeTheme } from 'electron'

import { IPC, EVENTS } from '../shared/ipc'
import type {
  ActionCopyBodyRequest,
  ActionCopyBodyResponse,
  ActionCopyPathRequest,
  ActionCopyPathResponse,
  ActionOpenEditorRequest,
  ActionOpenEditorResponse,
  ConfigGetRootsResponse,
  ScannerRescanResponse,
  ScannerStatusResponse,
  SystemAppearanceResponse,
} from '../shared/ipc'
import { getHandlers } from './actions'
import { loadUserConfig } from './scanner/config'
import { runScan } from './scanner'

type Status = {
  scanning: boolean
  lastScannedAt: number | null
  lastError?: string
}

let status: Status = { scanning: false, lastScannedAt: null }
let inFlight: Promise<ScannerRescanResponse> | null = null

async function performScan(): Promise<ScannerRescanResponse> {
  if (inFlight) return inFlight
  status = { ...status, scanning: true, lastError: undefined }
  inFlight = (async () => {
    try {
      const loaded = await loadUserConfig()
      const result = await runScan({
        config: loaded.config,
        originalsRootResolved: loaded.originalsRootResolved,
        configWarnings: loaded.warnings.map((m) => ({
          kind: 'access' as const,
          path: loaded.configPath,
          message: m,
        })),
      })
      status = { scanning: false, lastScannedAt: result.scannedAt }
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      status = { ...status, scanning: false, lastError: message }
      throw err
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

function currentTheme(): 'light' | 'dark' {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
}

function broadcastAppearance(): void {
  const theme = currentTheme()
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(EVENTS.SYSTEM_APPEARANCE_CHANGED, { theme })
  }
}

let appearanceListenerAttached = false

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.SCANNER_RESCAN, async (): Promise<ScannerRescanResponse> => {
    return performScan()
  })

  ipcMain.handle(IPC.SCANNER_STATUS, async (): Promise<ScannerStatusResponse> => {
    return { ...status }
  })

  ipcMain.handle(IPC.CONFIG_GET_ROOTS, async (): Promise<ConfigGetRootsResponse> => {
    const loaded = await loadUserConfig()
    return { roots: loaded.config.roots, configPath: loaded.configPath }
  })

  // Action handlers route through the registry indirection so Playwright spies
  // can replace them at runtime without env-flag short-circuits in production.
  ipcMain.handle(
    IPC.ACTION_OPEN_EDITOR,
    async (_e, req: ActionOpenEditorRequest): Promise<ActionOpenEditorResponse> => {
      return getHandlers().openEditor(req.absPath)
    },
  )

  ipcMain.handle(
    IPC.ACTION_COPY_PATH,
    async (_e, req: ActionCopyPathRequest): Promise<ActionCopyPathResponse> => {
      return getHandlers().copyPath(req.absPath)
    },
  )

  ipcMain.handle(
    IPC.ACTION_COPY_BODY,
    async (_e, req: ActionCopyBodyRequest): Promise<ActionCopyBodyResponse> => {
      return getHandlers().copyBody(req.body)
    },
  )

  ipcMain.handle(IPC.SYSTEM_APPEARANCE, async (): Promise<SystemAppearanceResponse> => {
    return { theme: currentTheme() }
  })

  // Forward nativeTheme changes to every renderer window. Idempotent guard so
  // repeated registerIpcHandlers() calls (in dev) don't stack listeners.
  if (!appearanceListenerAttached) {
    nativeTheme.on('updated', broadcastAppearance)
    appearanceListenerAttached = true
  }
}
