import type { BrowserWindowConstructorOptions } from 'electron'
import { BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { broadcast } from './frame'

function handleMessages() {
  process.on('uncaughtException', error => {
    console.error(error)
    broadcast('uncaught-error', String(error))
  })
  process.on('unhandledRejection', (error: Error) => {
    console.error(error)
    broadcast('uncaught-error', String(error))
  })
  ipcMain.handle('close', event => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    if (!frame) return
    frame.close()
  })
  ipcMain.handle('get-ref:fullscreen', (event) => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    if (!frame) return false
    return frame.isFullScreen()
  })
  ipcMain.handle('set-ref:fullscreen', (event, value: boolean) => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    if (!frame) return
    frame.setFullScreen(value)
  })
  ipcMain.handle('get-ref:vibrancy', (event) => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    if (!frame) return null
    return frame['__vibrancy'] ?? 'selection'
  })
  ipcMain.handle('set-ref:vibrancy', (event, value: BrowserWindowConstructorOptions['vibrancy']) => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    if (!frame) return
    frame.setVibrancy(value ?? null)
    frame['__vibrancy'] = value ?? null
    frame.webContents.send('update-ref:vibrancy', frame['__vibrancy'])
  })
  ipcMain.handle('get-ref:dark-mode', () => {
    return nativeTheme.shouldUseDarkColors
  })
  ipcMain.handle('set-ref:dark-mode', (event, value: boolean) => {
    nativeTheme.themeSource = value ? 'dark' : 'light'
  })
  nativeTheme.on('updated', () => {
    broadcast('update-ref:dark-mode', nativeTheme.shouldUseDarkColors)
  })
}

function handleEvents(frame: BrowserWindow) {
  frame.on('minimize', () => {
    frame.webContents.send('update-ref:minimized', true)
  })
  frame.on('restore', () => {
    frame.webContents.send('update-ref:minimized', false)
  })
  frame.on('maximize', () => {
    frame.webContents.send('update-ref:maximized', true)
  })
  frame.on('unmaximize', () => {
    frame.webContents.send('update-ref:maximized', false)
  })
  frame.on('enter-full-screen', () => {
    frame.webContents.send('update-ref:fullscreen', true)
  })
  frame.on('leave-full-screen', () => {
    frame.webContents.send('update-ref:fullscreen', false)
  })
  frame['__vibrancy'] = 'selection'
}

export {
  handleMessages,
  handleEvents,
}
