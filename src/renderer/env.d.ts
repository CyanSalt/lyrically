/// <reference types="vite/client" />
/// <reference types="@vue-macros/reactivity-transform/macros-global" />
import type { WorldBridge } from '../preload/types'

declare global {
  const worldBridge: WorldBridge
}
