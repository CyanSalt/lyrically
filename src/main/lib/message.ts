import * as util from 'node:util'
import applescript from 'applescript'
import { app, BrowserWindow, ipcMain, nativeTheme, powerSaveBlocker, shell } from 'electron'
import { broadcast } from './frame'

const executeApplescript = util.promisify(applescript.execString)

function handleMessages() {
  ipcMain.on('get-name', event => {
    event.returnValue = app.name
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
    return executeApplescript(script).catch(() => undefined)
  })
  ipcMain.handle('prevent-display-sleep', () => {
    return powerSaveBlocker.start('prevent-display-sleep')
  })
  ipcMain.handle('resume-display-sleep', (event, id: number) => {
    return powerSaveBlocker.stop(id)
  })
  ipcMain.handle('open-external', (event, url: string) => {
    shell.openExternal(url)
  })
}

function handleEvents(frame: BrowserWindow) {
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
}

export {
  handleMessages,
  handleEvents,
}
