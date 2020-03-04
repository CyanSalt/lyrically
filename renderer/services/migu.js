import * as http from 'http'
import {fetchify} from '../utils/fetch'
import {getPlainText} from '../utils/helper'
import CryptoJS from 'crypto-js'
import JSEncrypt from 'node-jsencrypt'

const get = fetchify(http.get)

/**
 * {@link https://github.com/jsososo/MiguMusicApi/blob/master/util/SongUrl.ts}
 */
function encrypt(data) {
  const publicKey = [
    '-----BEGIN PUBLIC KEY-----',
    'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8asrfSaoOb4je+DSmKdriQJKW',
    'VJ2oDZrs3wi5W67m3LwTB9QVR+cE3XWU21Nx+YBxS0yun8wDcjgQvYt625ZCcgin',
    '2ro/eOkNyUOTBIbuj9CvMnhUYiR61lC1f1IGbrSYYimqBVSjpifVufxtx/I3exRe',
    'ZosTByYp4Xwpb1+WAQIDAQAB',
    '-----END PUBLIC KEY-----',
  ].join('\n')
  const encryption = new JSEncrypt()
  encryption.setPublicKey(publicKey)
  const source = JSON.stringify(data)
  const key = CryptoJS.SHA256(String(1e3 * Math.random())).toString()
  const encrypted = CryptoJS.lib.Cipher._createHelper(CryptoJS.algo.AES)
    .encrypt(source, key).toString()
  const secret = encryption.encrypt(key)
  return {
    encrypted,
    secret,
  }
}

export default {

  async search(keyword) {
    const result = await fetch(
      `http://music.migu.cn/v2/async/search?keyword=${encodeURIComponent(keyword)}`
    ).then(response => response.json())
    return result.searchResult.object.songList
  },

  async getData(song) {
    const info = {
      name: getPlainText(song.musicName),
    }
    const {encrypted, secret} = encrypt({
      copyrightId: song.fullSongCopyrightId,
      auditionsFlag: 0,
    })
    const musicData = await get(
      `http://music.migu.cn/v3/api/music/audioPlayer/getPlayInfo?dataType=2&data=${encodeURIComponent(encrypted)}&secKey=${encodeURIComponent(secret)}`,
      {headers: {Referer: 'http://music.migu.cn/v3/music/player/audio'}}
    ).then(response => response.json())
    const music = musicData.data.hqPlayInfo.playUrl
    const lyricData = await get(
      `http://music.migu.cn/v3/api/music/audioPlayer/getLyric?copyrightId=${song.fullSongCopyrightId}`,
      {headers: {Referer: 'http://music.migu.cn/v3/music/player/audio'}}
    ).then(response => response.json())
    const lyric = lyricData.lyric
    return {
      info,
      music,
      lyric,
    }
  },

}
