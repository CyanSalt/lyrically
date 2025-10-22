import * as util from 'node:util'
import applescript from 'applescript'
import type { MenuItemConstructorOptions, PopupOptions, Rectangle } from 'electron'
import { app, BrowserWindow, ipcMain, Menu, nativeTheme, powerSaveBlocker, screen, shell, systemPreferences } from 'electron'
import { NowPlaying } from 'node-nowplaying'
import { broadcast } from './frame'
import { createNotchWindow, createWindow } from './window'

const executeApplescript = util.promisify(applescript.execString)

function createIDGenerator() {
  let id = 1n
  return () => {
    id += 1n
    return id
  }
}

const generateID = createIDGenerator()

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
  ipcMain.handle('get-ref:high-contrast-mode', () => {
    return nativeTheme.shouldUseHighContrastColors
  })
  ipcMain.handle('set-ref:dark-mode', (event, value: boolean) => {
    nativeTheme.themeSource = value ? 'dark' : 'light'
  })
  nativeTheme.on('updated', () => {
    broadcast('update-ref:dark-mode', nativeTheme.shouldUseDarkColors)
    broadcast('update-ref:high-contrast-mode', nativeTheme.shouldUseHighContrastColors)
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
  ipcMain.handle('select-menu', (event, template: Partial<MenuItemConstructorOptions>[], options: PopupOptions) => {
    const { promise, resolve } = Promise.withResolvers()
    const frame = BrowserWindow.fromWebContents(event.sender)
    const menu = Menu.buildFromTemplate(template.map((item, index) => {
      return {
        ...item,
        label: item.label?.replace(/(?!<&)&(?![A-Z&])/g, '&&'),
        click: () => {
          resolve(index)
        },
      } satisfies MenuItemConstructorOptions
    }))
    menu.popup({
      ...options,
      window: frame ?? undefined,
    })
    menu.once('menu-will-close', () => {
      setTimeout(() => {
        resolve(-1)
      })
    })
    return promise
  })
  ipcMain.handle('open-window', (event, state: unknown) => {
    createWindow(state)
  })
  ipcMain.handle('open-notch-window', (event, state: unknown) => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    if (!frame) return
    createNotchWindow(frame, state)
  })
  ipcMain.handle('set-bounds', (event, bound: Partial<Rectangle>) => {
    const frame = BrowserWindow.fromWebContents(event.sender)
    if (!frame) return
    if ('width' in bound && !('x' in bound)) {
      const currentScreen = screen.getDisplayMatching(frame.getBounds())
      bound.x = (currentScreen.bounds.width - bound.width!) / 2
    }
    frame.setBounds(bound, true)
    if (process.platform === 'darwin') {
      frame.invalidateShadow()
    }
  })
  let unsubscribeMap = new Map<number, () => void>()
  ipcMain.handle('subscribe-notification', (event, name) => {
    let id: number
    const unsubscribe = () => {
      event.sender.off('destroyed', unsubscribe)
      unsubscribeMap.delete(id)
      systemPreferences.unsubscribeNotification(id)
    }
    id = systemPreferences.subscribeNotification(name, () => {
      event.sender.send('notification', name)
    })
    event.sender.on('destroyed', unsubscribe)
    unsubscribeMap.set(id, unsubscribe)
    return id
  })
  ipcMain.handle('unsubscribe-notification', (event, id) => {
    const unsubscribe = unsubscribeMap.get(id)
    if (unsubscribe) {
      unsubscribe()
    }
  })
  let nowPlayingMap = new Map<bigint, NowPlaying>()
  let unsubscribeNowPlayingMap = new Map<bigint, () => void>()
  ipcMain.handle('subscribe-now-playing', async event => {
    let id = generateID()
    const player = new NowPlaying(message => {
      event.sender.send('now-playing', message)
    })
    await player.subscribe()
    const unsubscribe = () => {
      event.sender.off('destroyed', unsubscribe)
      nowPlayingMap.delete(id)
      unsubscribeNowPlayingMap.delete(id)
      player.unsubscribe()
    }
    event.sender.on('destroyed', unsubscribe)
    nowPlayingMap.set(id, player)
    unsubscribeNowPlayingMap.set(id, unsubscribe)
    return id
  })
  ipcMain.handle('unsubscribe-now-playing', (event, id: bigint) => {
    const unsubscribe = unsubscribeNowPlayingMap.get(id)
    if (unsubscribe) {
      unsubscribe()
    }
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
