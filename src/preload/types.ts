import type { IpcRendererEvent, MenuItemConstructorOptions } from 'electron'

export interface WorldBridge {
  appName: string,
  platform: NodeJS.Platform,
  getRef: <T>(key: string, token?: string) => Promise<T>,
  setRef: <T>(key: string, value: T, token?: string) => Promise<void>,
  onUpdateRef: <T>(key: string, handler: (event: IpcRendererEvent, value: T, token?: string) => void) => () => void,
  close: () => void,
  applescript: <T>(script: string) => Promise<T>,
  preventDisplaySleep: () => () => Promise<void>,
  openExternal: (url: string) => void,
  select: (
    items: Partial<MenuItemConstructorOptions>[],
    position: [number, number] | MouseEvent,
    defaultIndex?: number,
  ) => Promise<number>,
}
