import type { BrowserWindowConstructorOptions } from 'electron'
import { memoize } from 'lodash-es'
import { injectIPC } from '../utils/compositions'

export const useFullscreen = memoize(() => {
  return injectIPC('fullscreen', false)
})

export const useVibrancy = memoize(() => {
  return injectIPC<BrowserWindowConstructorOptions['vibrancy']>('vibrancy', 'selection')
})

export const useAlwaysOnTop = memoize(() => {
  return injectIPC('always-on-top', false)
})

export const useDarkMode = memoize(() => {
  return injectIPC('dark-mode', false)
})
