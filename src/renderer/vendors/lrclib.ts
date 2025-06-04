import LrclibIcon from './lrclib.svg'
import { defineMusicService } from './types'

/**
 * {@link https://cloud.tencent.com/developer/article/1543945}
 */
export default defineMusicService<{
  id: number,
  name: string,
  artistName: string,
  albumName: string,
  syncedLyrics: string,
}>({
  name: 'lrclib',
  icon: LrclibIcon,
  async search(keyword) {
    const result = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(keyword)}`,
    ).then(response => response.json())
    return result
  },
  transform(song) {
    return {
      key: song.id,
      name: song.name,
      artists: [song.artistName],
      album: song.albumName,
    }
  },
  async load(song) {
    return {
      lyric: song.syncedLyrics,
    }
  },
})
