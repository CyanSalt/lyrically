import { contextBridge, ipcRenderer } from 'electron'
import type { WorldBridge } from './types'

const worldBridge: WorldBridge = {
  platform: process.platform,
  getRef(key, token) {
    return ipcRenderer.invoke(`get-ref:${key}`, token)
  },
  setRef(key, value, token) {
    return ipcRenderer.invoke(`set-ref:${key}`, value, token)
  },
  onUpdateRef(key, handler) {
    ipcRenderer.on(`update-ref:${key}`, handler)
    return () => {
      ipcRenderer.off(`update-ref:${key}`, handler)
    }
  },
  close() {
    ipcRenderer.invoke('close')
  },
  applescript(script) {
    return ipcRenderer.invoke('applescript', script)
  },
}

contextBridge.exposeInMainWorld('worldBridge', worldBridge)
