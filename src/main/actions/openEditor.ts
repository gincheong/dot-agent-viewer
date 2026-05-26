// Default open-editor handler.
//
// Resolution order:
//   1. If `$EDITOR` is set → spawn it with `[absPath]` (detached, unref).
//   2. Else → use Electron's `shell.openPath(absPath)`.
//
// Validates the path exists and is a file before doing anything. Sanitizes
// shell-meta even though we use array-form spawn (defense in depth).

import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'

import { shell } from 'electron'

const UNSAFE_CHARS = /[;&|\n]/

export async function openEditorHandler(
  absPath: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (UNSAFE_CHARS.test(absPath)) {
    return { ok: false, reason: 'unsafe path' }
  }

  try {
    const stat = await fs.stat(absPath)
    if (!stat.isFile()) {
      return { ok: false, reason: 'not a file' }
    }
  } catch {
    return { ok: false, reason: 'file missing' }
  }

  const editor = process.env.EDITOR
  if (editor && editor.trim().length > 0) {
    try {
      const child = spawn(editor, [absPath], {
        detached: true,
        stdio: 'ignore',
      })
      child.unref()
      return { ok: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, reason: `spawn failed: ${message}` }
    }
  }

  const errMsg = await shell.openPath(absPath)
  if (errMsg) {
    return { ok: false, reason: errMsg }
  }
  return { ok: true }
}
