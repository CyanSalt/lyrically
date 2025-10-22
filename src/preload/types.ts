import type { IpcRendererEvent, MenuItemConstructorOptions, Rectangle } from 'electron'
import type { NowPlayingMessage } from 'node-nowplaying'

export interface WorldBridge {
  appName: string,
  platform: NodeJS.Platform,
  isNotchAvailable: boolean,
  isNotchWindow: boolean,
  notchAreaWidth: number,
  notchAreaHeight: number,
  initialState: any,
  flags: Record<string, boolean>,
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
  openWindow: (state?: unknown) => void,
  openNotchWindow: (state?: unknown) => void,
  setBounds: (rect: Partial<Rectangle>) => void,
  subscribeNotification: (event: string, callback: () => void, immediate?: boolean) => () => void,
  subscribeNowPlaying: (callback: (message: NowPlayingMessage) => void) => () => void,
}
