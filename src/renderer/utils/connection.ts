import type { MusicInfo } from '../vendors/types'

export function checkConnectable() {
  return worldBridge.platform === 'darwin'
}

export function playConnected() {
  worldBridge.applescript('tell application "Music" to play')
}

export function pauseConnected() {
  worldBridge.applescript('tell application "Music" to pause')
}

export interface ConnectedData {
  isPlaying: boolean,
  currentTime: number,
  info: MusicInfo,
}

export type AppleMusicData = [
  playerState: 'playing' | 'paused',
  playerPosition: number,
  trackId: number,
  trackName: string,
  trackArtist: string,
  trackAlbum: string,
  trackArtwork: Uint8Array,
]

function toDataURL(blob: Blob) {
  const reader = new FileReader()
  return new Promise<string>((resolve, reject) => {
    reader.addEventListener('load', () => {
      resolve(reader.result as string)
    })
    reader.addEventListener('error', err => {
      reject(reader.error)
    })
    reader.readAsDataURL(blob)
  })
}

export async function getConnectedData(): Promise<ConnectedData | undefined> {
  const result = await worldBridge.applescript<AppleMusicData | undefined>('if application "Music" is running then tell application "Music" to get player state & (get player position) & (get {id, name, artist, album} of current track) & (get raw data of artwork 1 of current track)')
  if (!result) return undefined
  return {
    isPlaying: result[0] === 'playing',
    currentTime: result[1],
    info: {
      key: result[2],
      name: result[3],
      artists: result[4].split(' & '),
      album: result[5],
      artwork: await toDataURL(new Blob([result[6]])),
    },
  }
}
