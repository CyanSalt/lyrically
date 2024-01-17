import NeteaseIcon from './netease.svg'
import { defineMusicService } from './types'

/**
 * {@link https://cloud.tencent.com/developer/article/1543945}
 */
export default defineMusicService<{
  id: string,
  name: string,
  artists?: { name: string }[],
  album?: { name: string },
}>({
  name: 'netease',
  icon: NeteaseIcon,
  async search(keyword) {
    const result = await fetch(
      `https://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=10`,
    ).then(response => response.json())
    return result.result ? result.result.songs : []
  },
  transform(song) {
    return {
      key: song.id,
      name: song.name,
      artist: song.artists?.[0]?.name,
      album: song.album?.name,
    }
  },
  async load(song) {
    // const loadPicture = async () => {
    //   const detail = await fetch(
    //     `https://music.163.com/api/song/detail?id=${song.id}&ids=[${song.id}]`,
    //   ).then(response => response.json())
    //   return detail.songs[0].album.picUrl
    // }
    // const loadingPicture = loadPicture()
    const lyrics = await fetch(
      `https://music.163.com/api/song/lyric?id=${song.id}&lv=1&kv=1&tv=-1`,
    ).then(response => response.json())
    const lyric = lyrics.lrc.lyric
    // const picture = await loadingPicture
    return {
      lyric,
      // picture,
    }
  },
  prepare(song) {
    return `http://music.163.com/song/media/outer/url?id=${song.id}.mp3`
  },
})
