// Dev/prod URL selection:
// electron-vite sets ELECTRON_RENDERER_URL in dev mode automatically.
// We use that env var directly (no extra dependency like @electron-toolkit/utils)
// to keep the scaffold dependency-lean. Phase B will add @electron-toolkit/utils
// when the full IPC layer and preload types are introduced.

import { app, BrowserWindow } from 'electron'
import { join } from 'path'

import { registerIpcHandlers } from './ipc'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 900,
    height: 640,
    title: 'dot-agent-viewer',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
