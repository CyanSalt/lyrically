/// <reference types="vite/client" />
/// <reference types="@vue-macros/reactivity-transform/macros-global" />
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
