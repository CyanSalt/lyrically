import type { IpcRendererEvent } from 'electron'
import { cloneDeep } from 'lodash-es'
import { customRef, watchEffect } from 'vue'

export function injectIPC<T>(key: string, defaultValue: T, token?: string) {
  return customRef<T>((track, trigger) => {
    let currentValue = defaultValue
    let initialized = false
    watchEffect((onInvalidate) => {
      const handler = (event: IpcRendererEvent, newValue: T, currentToken?: string) => {
        if (token && currentToken !== token) return
        initialized = true
        currentValue = newValue
        trigger()
      }
      const dispose = worldBridge.onUpdateRef(key, handler)
      onInvalidate(() => {
        dispose()
      })
    })
    return {
      get() {
        track()
        if (!initialized) {
          initialized = true
          worldBridge.getRef<T>(key, token).then(newValue => {
            currentValue = newValue
            trigger()
          })
        }
        return currentValue
      },
      set(newValue) {
        worldBridge.setRef(key, cloneDeep(newValue), token)
      },
    }
  })
}
