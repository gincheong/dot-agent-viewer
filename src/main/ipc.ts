// IPC handler registration for scanner + config channels.
// Phase B exposes: scanner:rescan, scanner:status, config:get-roots.
// Action and appearance channels are wired in Phase E.

import { ipcMain } from 'electron'

import { IPC } from '../shared/ipc'
import type {
  ConfigGetRootsResponse,
  ScannerRescanResponse,
  ScannerStatusResponse,
} from '../shared/ipc'
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
}
