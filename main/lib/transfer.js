const {ipcMain, BrowserWindow} = require('electron')
const {forEachWindow} = require('./frame')

function transferEvents(frame) {
  frame.on('maximize', () => {
    frame.webContents.send('maximize')
  })
  frame.on('unmaximize', () => {
    frame.webContents.send('unmaximize')
  })
  frame.on('enter-full-screen', () => {
    frame.webContents.send('enter-full-screen')
  })
  frame.on('leave-full-screen', () => {
    frame.webContents.send('leave-full-screen')
  })
}

function transferInvoking() {
  process.on('uncaughtException', error => {
    forEachWindow(frame => frame.webContents.send('uncaught-error', String(error)))
  })
  ipcMain.handle('toggleFullscreen', event => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    frame.setFullScreen(!frame.isFullScreen())
  })
  ipcMain.handle('close', event => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    frame.close()
  })
}

module.exports = {
  transferEvents,
  transferInvoking,
}
