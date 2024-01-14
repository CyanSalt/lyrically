import { contextBridge, ipcRenderer } from 'electron'
import type { WorldBridge } from './types'

const worldBridge: WorldBridge = {
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
    ipcRenderer.send('close')
  },
}

contextBridge.exposeInMainWorld('worldBridge', worldBridge)
