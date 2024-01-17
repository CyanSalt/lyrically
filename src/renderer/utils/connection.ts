export function checkConnectable() {
  return worldBridge.platform === 'darwin'
}

export function playConnected() {
  worldBridge.applescript('if application "Music" is running then tell application "Music" to play')
}

export function pauseConnected() {
  worldBridge.applescript('if application "Music" is running then tell application "Music" to pause')
}

export type ConnectedData = [
  playerState: 'playing' | 'paused',
  playerPosition: number,
  trackId: number,
  trackName: string,
  trackArtist: string,
  trackAlbum: string,
]

export function getConnectedData() {
  return worldBridge.applescript<ConnectedData | undefined>('if application "Music" is running then tell application "Music" to get player state & (get player position) & (get {id, name, artist, album} of current track)')
}
