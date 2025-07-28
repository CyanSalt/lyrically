import * as path from 'node:path'
import type { Display, Rectangle } from 'electron'
import { app, BrowserWindow, screen } from 'electron'
import { handleEvents } from './message'

function calculateDisplayNotchArea(display: Display) {
  const notch = require('node-mac-notch')
  const topLeftArea = notch.auxiliaryTopLeftArea(display.id)
  const topRightArea = notch.auxiliaryTopRightArea(display.id)
  return {
    x: topLeftArea.x + topLeftArea.width,
    // Seems a bug
    y: Math.min(
      topLeftArea.y + topLeftArea.height - display.size.height,
      topRightArea.y + topRightArea.height - display.size.height,
    ),
    width: topRightArea.x - (topLeftArea.x + topLeftArea.width),
    height: Math.max(topLeftArea.height, topRightArea.height),
  }
}

function getDisplayNotch(rect?: Rectangle) {
  if (process.platform !== 'darwin') return undefined
  let preferredDisplay: Display | undefined
  if (rect) {
    preferredDisplay = screen.getDisplayMatching(rect)
  }
  if (preferredDisplay) {
    const notchArea = calculateDisplayNotchArea(preferredDisplay)
    if (notchArea.height) {
      return {
        bounds: notchArea,
        display: preferredDisplay,
      }
    }
  }
  const displays = screen.getAllDisplays()
  for (const display of displays) {
    const notchArea = calculateDisplayNotchArea(display)
    if (notchArea.height) {
      return {
        bounds: notchArea,
        display,
      }
    }
  }
}

export function createWindow(initialState?: unknown) {
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
      additionalArguments: [
        ...(getDisplayNotch() ? ['--lyrically-notch-available'] : []),
        ...(initialState ? [`--lyrically-state=${JSON.stringify(initialState)}`] : []),
      ],
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

export function createNotchWindow(parent?: BrowserWindow, initialState?: unknown) {
  const notch = getDisplayNotch(parent?.getBounds())
  if (!notch) return createWindow(initialState)
  const width = notch.bounds.width
  const height = notch.bounds.height
  const frame = new BrowserWindow({
    show: false,
    title: app.name,
    x: notch.bounds.x,
    y: notch.bounds.y,
    width,
    height,
    minWidth: notch.bounds.width,
    minHeight: notch.bounds.height,
    frame: false,
    transparent: true,
    visualEffectState: 'active',
    enableLargerThanScreen: true,
    roundedCorners: false,
    movable: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hiddenInMissionControl: true,
    webPreferences: {
      preload: path.resolve(__dirname, '../preload/index.js'),
      additionalArguments: [
        '--lyrically-notch-available',
        `--lyrically-notch-width=${notch.bounds.width}`,
        `--lyrically-notch-height=${notch.bounds.height}`,
        ...(initialState ? [`--lyrically-state=${JSON.stringify(initialState)}`] : []),
      ],
    },
  })
  frame.setAlwaysOnTop(true, 'pop-up-menu')
  frame.loadFile(path.resolve(__dirname, '../renderer/index.html'))
  // Gracefully show window
  frame.once('ready-to-show', () => {
    frame.show()
  })
  handleEvents(frame)
  return frame
}
