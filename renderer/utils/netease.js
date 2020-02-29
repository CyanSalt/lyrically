/**
 * {@link https://cloud.tencent.com/developer/article/1543945}
 */

export async function searchSong(keyword) {
  const result = await fetch(
    `http://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=1`
  ).then(response => response.json())
  return result.result.songs
}

export async function getLyrics(id, translate) {
  const result = await fetch(
    `https://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=${translate ? -1 : 1}`
  ).then(response => response.json())
  return result
}

export function getMusicURL(id) {
  return `http://music.163.com/song/media/outer/url?id=${id}.mp3`
}
