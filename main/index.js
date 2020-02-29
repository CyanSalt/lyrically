const {app} = require('electron')
const {createWindow} = require('./lib/window')
const {hasWindow} = require('./lib/frame')
const {transferInvoking} = require('./lib/transfer')

app.allowRendererProcessReuse = false
transferInvoking()

app.on('ready', () => {
  createWindow()
})

app.on('activate', () => {
  if (!hasWindow() && app.isReady()) {
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
