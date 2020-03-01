const {ipcMain, BrowserWindow, nativeTheme} = require('electron')
const {forEachWindow} = require('./frame')

function transferEvents(frame) {
  frame.on('maximize', () => {
    frame.webContents.send('maximize')
  })
  frame.on('unmaximize', () => {
    frame.webContents.send('unmaximize')
  })
  frame.on('enter-full-screen', () => {
    frame.webContents.send('fullscreen-updated', true)
  })
  frame.on('leave-full-screen', () => {
    frame.webContents.send('fullscreen-updated', false)
  })
}

function transferInvoking() {
  process.on('uncaughtException', error => {
    forEachWindow(frame => frame.webContents.send('uncaught-error', String(error)))
  })
  ipcMain.handle('setFullscreen', (event, flag) => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    frame.setFullScreen(flag)
  })
  ipcMain.handle('close', event => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    frame.close()
  })
  ipcMain.handle('setDarkMode', (event, flag) => {
    nativeTheme.themeSource = flag ? 'dark' : 'light'
  })
  nativeTheme.on('updated', () => {
    forEachWindow(frame => frame.webContents.send('darkmode-updated', nativeTheme.shouldUseDarkColors))
  })
}

module.exports = {
  transferEvents,
  transferInvoking,
}
