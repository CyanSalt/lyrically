import type { IpcRendererEvent } from 'electron'

export interface WorldBridge {
  platform: NodeJS.Platform,
  getRef<T>(key: string, token?: string): Promise<T>,
  setRef<T>(key: string, value: T, token?: string): Promise<void>,
  onUpdateRef<T>(key: string, handler: (event: IpcRendererEvent, value: T, token?: string) => void): () => void,
  close(): void,
  applescript<T>(script: string): Promise<T>,
}
