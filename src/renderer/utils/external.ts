export function checkExternalSearchAvailable() {
  return worldBridge.platform === 'darwin'
}

export function openExternalSearch(keyword: string) {
  worldBridge.openExternal(`musics://music.apple.com/search?${String(new URLSearchParams({ term: keyword }))}`)
}

export function openExternalNowPlaying() {
  worldBridge.openExternal('musics://')
}
