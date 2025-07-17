export interface MusicInfo {
  key: any,
  name: string,
  artists?: string[],
  album?: string,
  /** in seconds */
  duration?: number,
  artwork?: string,
}

export interface MusicData<T = never> {
  lyric: string,
  picture?: string,
  detail?: T,
}

export interface MusicService<T, U = never> {
  name: string,
  icon: string,
  search: (keyword: string, info?: MusicInfo) => Promise<T[]>,
  transform: (song: T) => MusicInfo,
  load: (song: T) => Promise<MusicData<U>>,
  prepare?: (song: T, detail: U) => string | Promise<string>,
}

export function defineMusicService<T, U = never>(service: MusicService<T, U>) {
  return service
}
