import type { BrowserWindowConstructorOptions } from 'electron'
import { memoize } from 'lodash-es'
import { injectIPC } from '../utils/hooks'

export const useFullscreen = memoize(() => {
  return injectIPC('fullscreen', false)
})

export const useVibrancy = memoize(() => {
  return injectIPC<BrowserWindowConstructorOptions['vibrancy']>('vibrancy', 'selection')
})

export const useDarkMode = memoize(() => {
  return injectIPC('dark-mode', false)
})
