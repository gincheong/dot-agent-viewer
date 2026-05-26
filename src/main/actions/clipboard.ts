// Default clipboard handlers — copy-path / copy-body.
//
// Uses Electron's `clipboard.writeText` which writes to the macOS pasteboard
// synchronously. Both handlers return `{ ok: true }` for IPC symmetry.

import { clipboard } from 'electron'

export async function copyPathHandler(
  absPath: string,
): Promise<{ ok: true }> {
  clipboard.writeText(absPath)
  return { ok: true }
}

export async function copyBodyHandler(body: string): Promise<{ ok: true }> {
  clipboard.writeText(body)
  return { ok: true }
}
