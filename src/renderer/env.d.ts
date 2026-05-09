/// <reference types="vite/client" />
import type { WorldBridge } from '../preload/types'

declare global {
  const worldBridge: WorldBridge

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface PaintWorklet extends Worklet {}

  namespace CSS {
    // eslint-disable-next-line no-var
    var paintWorklet: PaintWorklet
  }
}
