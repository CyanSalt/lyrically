import { app } from 'electron'
import { handleMessages } from './lib/message'
import { createWindow } from './lib/window'

handleMessages()

async function initialize() {
  await app.whenReady()
  createWindow()
}

initialize()

app.on('activate', (event, hasVisibleWindows) => {
  if (!hasVisibleWindows && app.isReady()) {
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
