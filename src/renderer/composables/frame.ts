import { memoize } from 'lodash-es'
import type { MaybeRefOrGetter } from 'vue'
import { toValue, watchEffect } from 'vue'
import { injectIPC } from '../utils/composables'

export const useFullscreen = memoize(() => {
  return injectIPC('fullscreen', false)
})

export const useAlwaysOnTop = memoize(() => {
  return injectIPC('always-on-top', false)
})

export const useDarkMode = memoize(() => {
  return injectIPC('dark-mode', false)
})

export const useHighContrastMode = memoize(() => {
  return injectIPC('high-contrast-mode', false)
})

export function useDisplaySleepPrevented(refOrGetter: MaybeRefOrGetter<boolean>) {
  return watchEffect(async onInvalidate => {
    if (toValue(refOrGetter)) {
      const dispose = worldBridge.preventDisplaySleep()
      onInvalidate(dispose)
    }
  })
}
