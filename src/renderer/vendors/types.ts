export interface MusicInfo {
  key: any,
  name: string,
  artist?: string,
  album?: string,
}

export interface MusicData {
  music: string,
  lyric: string,
  picture?: string,
}

export interface MusicService<T> {
  name: string,
  icon: string,
  search: (keyword: string, info?: MusicInfo) => Promise<T[]>,
  resolve: (song: T) => MusicInfo,
  load: (song: T) => Promise<MusicData>,
}

export function defineMusicService<T>(service: MusicService<T>) {
  return service
}
