import * as path from 'path'
import { app, BrowserWindow } from 'electron'
import { hasWindow, getLastWindow } from './frame'
import { handleEvents } from './message'

function createWindow() {
  const options = {
    show: false,
    title: app.name,
    width: 960,
    height: 540,
    frame: false,
    transparent: true,
    vibrancy: 'selection' as const,
    acceptFirstMouse: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  }
  // frame offset
  if (hasWindow()) {
    const rect = getLastWindow().getBounds()
    Object.assign(options, {
      x: rect.x + 30,
      y: rect.y + 30,
    })
  }
  const frame = new BrowserWindow(options)
  frame.loadFile(path.resolve(__dirname, '../../renderer/index.html'))
  // gracefully show window
  frame.once('ready-to-show', () => {
    frame.show()
  })
  // these handler must be bound in main process
  handleEvents(frame)
  return frame
}

export {
  createWindow,
}
