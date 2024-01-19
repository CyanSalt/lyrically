import KugouIcon from './kugou.svg'
import { defineMusicService } from './types'

function decodeANSI(text: string) {
  return decodeURIComponent(text.split('').map(char => {
    return '%' + char.charCodeAt(0).toString(16).padStart(2, '0')
  }).join(''))
}

/**
 * {@link https://github.com/shichunlei/-Api/blob/master/%E9%85%B7%E7%8B%97%E9%9F%B3%E4%B9%90web%E7%AB%AF%E6%8E%A5%E5%8F%A3.md#}
 */
export default defineMusicService<{
  hash: string,
  songname: string,
  singername: string,
  group?: { album_name: string }[],
}, {
  url: string,
}>({
  name: 'netease',
  icon: KugouIcon,
  async search(keyword) {
    const result = await fetch(
      `http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword=${encodeURIComponent(keyword)}&page=1&pagesize=10&showtype=1`,
    ).then(response => response.json())
    return result.data ? result.data.info : []
  },
  transform(song) {
    return {
      key: song.hash,
      name: song.songname,
      artists: song.singername.split('、'),
      album: song.group?.[0]?.album_name,
    }
  },
  async load(song) {
    const loadDetail = async () => {
      return fetch(
        `https://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo&hash=${song.hash}`,
      ).then(response => response.json())
    }
    const loadingDetail = loadDetail()
    const result = await fetch(
      `https://lyrics.kugou.com/search?ver=1&man=yes&client=pc&hash=${song.hash}`,
    ).then(response => response.json())
    const info = result.candidates[0]
    const data = await fetch(
      `https://lyrics.kugou.com/download?ver=1&client=pc&id=${info.id}&accesskey=${info.accesskey}&fmt=lrc&charset=utf8`,
    ).then(response => response.json())
    const lyric = decodeANSI(atob(data.content))
    const detail = await loadingDetail
    const picture = detail.album_img.replace(/\{size\}/g, '400')
    return {
      lyric,
      picture,
      detail,
    }
  },
  prepare(song, detail) {
    return detail.url
  },
})
