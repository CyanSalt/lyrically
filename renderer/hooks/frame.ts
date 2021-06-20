import type { BrowserWindowConstructorOptions, NativeTheme } from 'electron'
import { memoize } from 'lodash-es'
import { injectIPC } from '../utils/hooks'

export const useFullscreen = memoize(() => {
  return injectIPC('fullscreen', false)
})

export const useVibrancy = memoize(() => {
  return injectIPC<BrowserWindowConstructorOptions['vibrancy']>('vibrancy', 'selection')
})

export const useThemeSource = memoize(() => {
  return injectIPC<NativeTheme['themeSource']>('theme-source', 'system')
})
