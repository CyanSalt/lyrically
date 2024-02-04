import * as path from 'node:path'
import { app, BrowserWindow } from 'electron'
import { handleEvents } from './message'

export function createWindow() {
  const frame = new BrowserWindow({
    show: false,
    title: app.name,
    width: 960,
    height: 540,
    frame: false,
    transparent: process.platform === 'darwin',
    vibrancy: 'hud' as const,
    visualEffectState: 'active',
    webPreferences: {
      preload: path.resolve(__dirname, '../preload/index.js'),
    },
  })
  frame.loadFile(path.resolve(__dirname, '../renderer/index.html'))
  // Gracefully show window
  frame.once('ready-to-show', () => {
    frame.show()
  })
  handleEvents(frame)
  return frame
}
