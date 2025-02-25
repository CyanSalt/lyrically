import { contextBridge, ipcRenderer } from 'electron'
import mri from 'mri'
import type { WorldBridge } from './types'

const args = mri(process.argv)

const worldBridge: WorldBridge = {
  appName: ipcRenderer.sendSync('get-name'),
  platform: process.platform,
  isNotchAvailable: Boolean(args['lyrically-notch-available']),
  isNotchWindow: Boolean(args['lyrically-notch-width'] && args['lyrically-notch-height']),
  notchAreaWidth: Number(args['lyrically-notch-width']) || 0,
  notchAreaHeight: Number(args['lyrically-notch-height']) || 0,
  getRef: (key, token) => {
    return ipcRenderer.invoke(`get-ref:${key}`, token)
  },
  setRef: (key, value, token) => {
    return ipcRenderer.invoke(`set-ref:${key}`, value, token)
  },
  onUpdateRef: (key, handler) => {
    ipcRenderer.on(`update-ref:${key}`, handler)
    return () => {
      ipcRenderer.off(`update-ref:${key}`, handler)
    }
  },
  close: () => {
    ipcRenderer.invoke('close')
  },
  applescript: script => {
    return ipcRenderer.invoke('applescript', script)
  },
  preventDisplaySleep: () => {
    const request = ipcRenderer.invoke('prevent-display-sleep')
    return async () => {
      const id = await request
      return ipcRenderer.invoke('resume-display-sleep', id)
    }
  },
  openExternal: url => {
    ipcRenderer.invoke('open-external', url)
  },
  select: (items, position, defaultIndex = -1) => {
    const coords = Array.isArray(position)
      ? { x: position[0], y: position[1] }
      : { x: position.clientX, y: position.clientY }
    return ipcRenderer.invoke('select-menu', items, {
      positioningItem: defaultIndex,
      ...coords,
    })
  },
  openWindow: () => {
    ipcRenderer.invoke('open-window')
  },
  openNotchWindow: () => {
    ipcRenderer.invoke('open-notch-window')
  },
  setBounds: bounds => {
    ipcRenderer.invoke('set-bounds', bounds)
  },
}

contextBridge.exposeInMainWorld('worldBridge', worldBridge)
