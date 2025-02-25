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
      additionalArguments: [
        ...(getDisplayNotch() ? ['--lyrically-notch-available'] : []),
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

export function createNotchWindow(parent?: BrowserWindow) {
  const notch = getDisplayNotch(parent?.getBounds())
  if (!notch) return createWindow()
  const spreadSize = 6
  const width = notch.bounds.width * 2
  // const height = notch.bounds.height * 6
  const compactHeight = Math.ceil((3.75 + 2 + 1) * 14 + 3 * 12)
  const frame = new BrowserWindow({
    show: false,
    title: app.name,
    x: notch.bounds.x - spreadSize - Math.round((width - notch.bounds.width) / 2),
    y: notch.bounds.y,
    width: width + spreadSize * 2,
    // height,
    height: compactHeight,
    minWidth: notch.bounds.width + spreadSize * 2,
    // minHeight: notch.bounds.height,
    minHeight: compactHeight,
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
