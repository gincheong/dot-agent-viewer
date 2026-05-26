// Dev/prod URL selection:
// electron-vite sets ELECTRON_RENDERER_URL in dev mode automatically.
// We use that env var directly (no extra dependency like @electron-toolkit/utils)
// to keep the scaffold dependency-lean.
//
// Phase E additions:
//   - `installDefaultHandlers()` seeds the action registry before IPC handlers
//     start invoking it.
//   - Application Menu carries a "Refresh" MenuItem bound to CmdOrCtrl+R; the
//     menu accelerator only fires when our window is focused (unlike
//     globalShortcut, which fires app-wide).

import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'
import { join } from 'path'

import { EVENTS } from '../shared/ipc'
import { installDefaultHandlers } from './actions'
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

function buildApplicationMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: MenuItemConstructorOptions[] = []

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    })
  }

  template.push({
    label: 'View',
    submenu: [
      {
        label: 'Refresh',
        accelerator: 'CmdOrCtrl+R',
        click: () => {
          const target = BrowserWindow.getFocusedWindow()
          target?.webContents.send(EVENTS.APP_RESCAN_REQUEST)
        },
      },
      { type: 'separator' },
      { role: 'reload', accelerator: 'CmdOrCtrl+Shift+R' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  })

  template.push({ role: 'editMenu' })
  template.push({ role: 'windowMenu' })

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  installDefaultHandlers()
  registerIpcHandlers()
  buildApplicationMenu()
  createWindow()

  // --smoke-exit: after the real boot path completes (window created, IPC wired),
  // quit after a short delay so packaged-app smoke tests can confirm a clean launch.
  if (process.argv.includes('--smoke-exit')) {
    setTimeout(() => app.quit(), 2000)
    return
  }

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
