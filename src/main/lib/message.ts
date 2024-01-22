import * as util from 'node:util'
import applescript from 'applescript'
import type { BrowserWindowConstructorOptions } from 'electron'
import { BrowserWindow, ipcMain, nativeTheme, powerSaveBlocker } from 'electron'
import { broadcast } from './frame'

const executeApplescript = util.promisify(applescript.execString)

function handleMessages() {
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
    return frame['__vibrancy'] ?? 'hud'
  })
  ipcMain.handle('set-ref:vibrancy', (event, value: Exclude<BrowserWindowConstructorOptions['vibrancy'], 'appearance-based'>) => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    if (!frame) return
    frame.setVibrancy(value ?? null)
    frame['__vibrancy'] = value ?? null
    frame.webContents.send('update-ref:vibrancy', frame['__vibrancy'])
  })
  ipcMain.handle('get-ref:always-on-top', (event) => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    if (!frame) return null
    return frame.isAlwaysOnTop()
  })
  ipcMain.handle('set-ref:always-on-top', (event, value: boolean) => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    if (!frame) return null
    frame.setAlwaysOnTop(value)
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
  ipcMain.handle('applescript', (event, script: string) => {
    return executeApplescript(script)
  })
  ipcMain.handle('prevent-display-sleep', () => {
    return powerSaveBlocker.start('prevent-display-sleep')
  })
  ipcMain.handle('resume-display-sleep', (event, id: number) => {
    return powerSaveBlocker.stop(id)
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
  frame.on('always-on-top-changed', (event, isAlwaysOnTop) => {
    frame.webContents.send('update-ref:always-on-top', isAlwaysOnTop)
  })
  frame['__vibrancy'] = 'hud'
}

export {
  handleMessages,
  handleEvents,
}
