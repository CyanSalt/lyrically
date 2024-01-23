import { watchEffect } from 'vue'

export function useKeyboardShortcuts(fn: (event: KeyboardEvent) => void) {
  return watchEffect(onInvalidate => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target === document.body) {
        fn(event)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    onInvalidate(() => {
      window.removeEventListener('keydown', handleKeyDown)
    })
  })
}
