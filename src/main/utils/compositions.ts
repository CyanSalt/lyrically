import type { Ref } from '@vue/reactivity'
import { effect, stop, unref } from '@vue/reactivity'
import { ipcMain } from 'electron'
import { cloneDeep } from 'lodash'
import { broadcast } from '../lib/frame'

function provideIPC<T>(key: string, valueRef: Ref<T>) {
  ipcMain.handle(`get-ref:${key}`, async () => {
    const value = await Promise.resolve(unref(valueRef))
    return cloneDeep(value)
  })
  ipcMain.handle(`set-ref:${key}`, (event, value: T) => {
    valueRef.value = value
  })
  let latestValuePromise: Promise<Awaited<T>>
  const reactiveEffect = effect(async () => {
    const valuePromise = Promise.resolve(unref(valueRef))
    latestValuePromise = valuePromise
    const value = await valuePromise
    if (valuePromise === latestValuePromise) {
      broadcast(`update-ref:${key}`, cloneDeep(value))
    }
  })
  return () => {
    ipcMain.removeHandler(`get-ref:${key}`)
    ipcMain.removeHandler(`set-ref:${key}`)
    stop(reactiveEffect)
  }
}

export {
  provideIPC,
}
