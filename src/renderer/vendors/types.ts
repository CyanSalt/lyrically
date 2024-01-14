export interface MusicInfo {
  name: string,
}

export interface MusicData {
  info: MusicInfo,
  music: string,
  lyric: string,
}

export interface MusicService<T> {
  name: string,
  icon: string,
  search: (keyword: string) => Promise<T[]>,
  load: (song: T) => Promise<MusicData>,
}

export function defineMusicService<T>(service: MusicService<T>) {
  return service
}
