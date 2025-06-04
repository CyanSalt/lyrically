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

async function getConnectedData(): Promise<ConnectedData | undefined> {
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

async function getConnectedTime(): Promise<number | undefined> {
  const result = await worldBridge.applescript<number | undefined>('if application "Music" is running then tell application "Music" to get player position')
  return result
}

export interface ConnectionSubscription {
  onTimeUpdate: (time: number) => void,
  onChange: (data: ConnectedData | undefined) => void,
}

export function subscribePlayerPosition(onTimeUpdate: ConnectionSubscription['onTimeUpdate'], initialTime: number) {
  let base = performance.now()
  let requestId: number
  const callback: FrameRequestCallback = time => {
    requestId = requestAnimationFrame(callback)
    onTimeUpdate(initialTime + (time - base) / 1000)
  }
  requestId = requestAnimationFrame(callback)
  const timer = setInterval(async () => {
    const time = await getConnectedTime()
    if (time !== undefined) {
      initialTime = time
      base = performance.now()
      onTimeUpdate(initialTime)
    }
  }, 10000)
  onTimeUpdate(initialTime)
  return () => {
    clearInterval(timer)
    cancelAnimationFrame(requestId)
  }
}

export function subscribeConnection({ onTimeUpdate, onChange }: ConnectionSubscription) {
  // const timer = setInterval(async () => {
  //   const result = await getConnectedData()
  //   callback(result)
  // }, 1000)
  // return () => {
  //   clearInterval(timer)
  // }
  let unsubscribeTime: (() => void) | undefined
  const listener = async () => {
    const result = await getConnectedData()
    unsubscribeTime?.()
    if (result?.isPlaying) {
      unsubscribeTime = subscribePlayerPosition(
        onTimeUpdate,
        result.currentTime,
      )
    }
    onChange(result)
  }
  const unsubscribe = worldBridge.onNotification('com.apple.iTunes.playerInfo', listener)
  listener()
  return () => {
    unsubscribeTime?.()
    unsubscribe()
  }
}
