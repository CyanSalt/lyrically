export interface MusicInfo {
  key: any,
  name: string,
  artist?: string,
  album?: string,
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
  load: (song: T) => Promise<MusicData>,
  prepare?: (song: T, detail: U) => string | Promise<string>,
}

export function defineMusicService<T>(service: MusicService<T>) {
  return service
}
