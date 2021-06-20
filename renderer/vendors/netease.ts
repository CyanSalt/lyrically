import { defineMusicService } from './types'

/**
 * {@link https://cloud.tencent.com/developer/article/1543945}
 */
export default defineMusicService<{ id: string, name: string }>({

  icon: './assets/vendors/netease.png',

  async search(keyword) {
    const result = await fetch(
      `http://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=1`
    ).then(response => response.json())
    return result.result.songs
  },

  async getData(song) {
    const info = {
      name: song.name,
    }
    const music = `http://music.163.com/song/media/outer/url?id=${song.id}.mp3`
    const lyrics = await fetch(
      `https://music.163.com/api/song/lyric?id=${song.id}&lv=1&kv=1&tv=-1`
    ).then(response => response.json())
    const lyric = lyrics.lrc.lyric
    return {
      info,
      music,
      lyric,
    }
  },

})
