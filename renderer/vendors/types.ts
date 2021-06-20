export interface MusicInfo {
  name: string,
}

export interface MusicData {
  info: MusicInfo,
  music: string,
  lyric: string,
}

export interface MusicService<T> {
  icon: string,
  search: (keyword: string) => Promise<T[]>,
  getData: (song: T) => Promise<MusicData>,
}

export function defineMusicService<T>(service: MusicService<T>) {
  return service
}
