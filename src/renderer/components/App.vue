<script lang="ts" setup>
import { LucideCloud, LucideCloudOff, LucideMaximize, LucideMinimize, LucideMonitor, LucideMonitorOff, LucideMonitorPause, LucideMonitorPlay, LucideMoon, LucideMove, LucidePause, LucidePlay, LucideSun, LucideX } from 'lucide-vue-next'
import type { CSSProperties } from 'vue'
import { nextTick, watchEffect } from 'vue'
import { useDarkMode, useFullscreen, useVibrancy } from '../compositions/frame'
import { getHashCode, LCG } from '../utils/helper'
import { parseLRC } from '../utils/lrc'
import NeteaseService from '../vendors/netease'
import type { MusicData, MusicInfo, MusicService } from '../vendors/types'

let darkMode = $(useDarkMode())
let fullscreen = $(useFullscreen())
let vibrancy = $(useVibrancy())

let isPlaying = $ref(false)
let currentTime = $ref(0)
let service = $shallowRef<MusicService<any>>(NeteaseService)
let keyword = $ref('')
let info = $ref<MusicInfo>()
let data = $ref<MusicData>()

let isConnected = $ref(false)
let connectedInfo = $ref<MusicInfo>()

const audio = $ref<HTMLAudioElement>()

const music = $computed(() => {
  if (isConnected) return undefined
  if (!data) return undefined
  return data.music
})

const lyrics = $computed(() => {
  if (!data) return []
  return parseLRC(data.lyric)
})

const lyricTexts = $computed(() => {
  return lyrics.map(item => item.text)
})

const currentIndex = $computed(() => {
  const animationTime = 1
  return lyrics
    .map(row => currentTime >= (row.time - animationTime))
    .lastIndexOf(true)
})

const indexes = $computed(() => {
  return [currentIndex + 1, currentIndex, currentIndex - 1]
})

const classes = ['next', 'current', 'prev']

function generateStyle(lyric: string, type: 'edge' | 'inside' | 'outside') {
  const style: CSSProperties = {}
  if (!lyric) {
    return style
  }
  const rv = LCG(getHashCode(lyric))()
  if (rv < 0.2) {
    style.background = 'var(--foreground)'
    style.color = 'var(--background)'
  }
  const rand = LCG(getHashCode(lyric + type))
  if (type === 'outside') {
    const x = (n => (n > 0 ? 50 : -50) + n * 50)(rand() * 2 - 1) // -100 ~ -50, 50 ~ 100
    const y = (n => (n > 0 ? 50 : -50) + n * 50)(rand() * 2 - 1)
    const r1 = rand() * 2 - 1 // -1 ~ 1
    const r2 = rand() * 2 - 1
    const r3 = rand() * 2 - 1
    const a = (rand() * 2 - 1) * 180 // -180 ~ 180
    const s = rand() * 0.5 // 0 ~ 0.5
    style.transform = `translate(${x}vw, ${y}vh) rotate3d(${r1}, ${r2}, ${r3}, ${a}deg) scale(${s})`
  } else if (type === 'edge') {
    const x = (n => (n > 0 ? 25 : -25) + n * 25)(rand() * 2 - 1) // -50 ~ -25, 25 ~ 50
    const y = (n => (n > 0 ? 25 : -25) + n * 25)(rand() * 2 - 1)
    const r1 = rand() * 2 - 1 // -1 ~ 1
    const r2 = rand() * 2 - 1
    const r3 = rand() * 2 - 1
    const a = (rand() * 2 - 1) * 90 // -90 ~ 90
    const s = rand() * 0.5 + 0.25 // 0.25 ~ 0.75
    style.transform = `translate(${x}vw, ${y}vh) rotate3d(${r1}, ${r2}, ${r3}, ${a}deg) scale(${s})`
  } else {
    const x = (rand() * 2 - 1) * 25 // -25 ~ 25
    const y = (rand() * 2 - 1) * 25
    const r1 = rand() * 2 - 1 // -1 ~ 1
    const r2 = rand() * 2 - 1
    const r3 = rand() * 2 - 1
    const a = (rand() * 2 - 1) * 45 // -45 ~ 45
    const x1 = `calc(${x}vw ${x > 0 ? '-' : '+'} ${Math.abs(x)}%)`
    const y1 = `calc(${y}vh ${y > 0 ? '-' : '+'} ${Math.abs(y)}%)`
    style.transform = `translate(${x1}, ${y1}) rotate3d(${r1}, ${r2}, ${r3}, ${a}deg)`
  }
  return style
}

const styles = $computed(() => {
  return [
    generateStyle(lyricTexts[indexes[0]], 'edge'),
    generateStyle(lyricTexts[indexes[1]], 'inside'),
    generateStyle(lyricTexts[indexes[2]], 'outside'),
  ]
})

const vendors = [
  NeteaseService,
]

function close() {
  worldBridge.close()
}

function toggleFullscreen() {
  fullscreen = !fullscreen
}

function toggleDarkMode() {
  darkMode = !darkMode
}

function toggleVibrancy() {
  vibrancy = vibrancy ? undefined : 'hud'
}

function play() {
  if (isConnected) {
    if (isPlaying) {
      worldBridge.applescript('if application "Music" is running then tell application "Music" to pause')
    } else {
      worldBridge.applescript('if application "Music" is running then tell application "Music" to play')
    }
  }
  if (!music) return
  if (!audio) return
  if (audio.paused) {
    audio.play()
  } else {
    audio.pause()
  }
}

const isMacOS = worldBridge.platform === 'darwin'

function connect() {
  isConnected = !isConnected
}

async function load(query: string, properties?: MusicInfo) {
  const songs = await service.search(query)
  const song = songs.find(item => {
    const resolved = service.resolve(item)
    if (properties?.album && resolved.album !== properties.album) return false
    if (properties?.artist && resolved.artist !== properties.artist) return false
    return true
  }) ?? songs[0]
  if (!song) return
  info = service.resolve(song)
  data = await service.load(song)
}

watchEffect(async () => {
  if (music) {
    currentTime = 0
    await nextTick()
    if (audio) {
      audio.play()
    }
  }
})

function search(event: InputEvent) {
  const query = (event.target as HTMLInputElement).value
  if (query) {
    load(query)
  }
}

function activate(vendor: MusicService<any>) {
  service = vendor
}

function handlePause() {
  isPlaying = false
}

function handlePlay() {
  isPlaying = true
  if (info) {
    keyword = info.name
  }
}

function handleTimeUpdate(event: Event) {
  currentTime = (event.target as HTMLAudioElement).currentTime
}

function handleEnded() {
  isPlaying = false
}

watchEffect(onInvalidate => {
  if (isConnected) {
    const timer = setInterval(async () => {
      const result = await worldBridge.applescript('if application "Music" is running then tell application "Music" to get player state & (get player position) & (get {id, name, artist, album} of current track)')
      if (result) {
        isPlaying = result[0] === 'playing' // or 'paused'
        currentTime = result[1]
        if (!connectedInfo || connectedInfo.key !== result[2] || connectedInfo.name !== result[3]) {
          keyword = result[3]
          connectedInfo = {
            key: result[2],
            name: result[3],
            artist: result[4],
            album: result[5],
          }
          load(keyword, connectedInfo)
        }
      } else {
        isPlaying = false
        currentTime = 0
        keyword = ''
        data = undefined
      }
    }, 1000)
    onInvalidate(() => {
      clearInterval(timer)
    })
  }
})
</script>

<template>
  <div :class="['app', { 'is-vibrant': vibrancy }]">
    <div :class="['container', { 'is-distant': !isPlaying }]">
      <div
        v-for="(index, order) in indexes"
        :key="index"
        :style="styles[order]"
        :class="[classes[order], 'lyric']"
      >{{ lyricTexts[index] }}</div>
    </div>
    <div :class="['control-bar', { 'is-resident': !isPlaying }]">
      <div class="control-item move">
        <LucideMove />
      </div>
      <div class="control-item" @click="close">
        <LucideX />
      </div>
      <div class="control-item" @click="toggleFullscreen">
        <LucideMinimize v-if="fullscreen" />
        <LucideMaximize v-else />
      </div>
      <div class="control-item" @click="toggleDarkMode">
        <LucideSun v-if="darkMode" />
        <LucideMoon v-else />
      </div>
      <div class="control-item" @click="toggleVibrancy">
        <LucideCloud v-if="vibrancy" />
        <LucideCloudOff v-else />
      </div>
      <div class="control-item" @click="play">
        <template v-if="isConnected">
          <LucideMonitorPause v-if="isPlaying" />
          <LucideMonitorPlay v-else />
        </template>
        <template v-else>
          <LucidePause v-if="isPlaying" />
          <LucidePlay v-else />
        </template>
      </div>
    </div>
    <div v-if="!isPlaying" class="searcher">
      <input v-model="keyword" :readonly="isConnected" class="searcher-input" @change="search">
      <div class="searcher-bar">
        <div v-if="isMacOS" class="control-item" @click="connect">
          <LucideMonitorOff v-if="isConnected" />
          <LucideMonitor v-else />
        </div>
        <div class="vendor-list">
          <div
            v-for="vendor in vendors"
            :key="vendor.name"
            :class="['vendor-item', { 'is-active': service === vendor }]"
            @click="activate(vendor)"
          >
            <img :src="vendor.icon" class="vendor-icon">
          </div>
        </div>
      </div>
    </div>
    <audio
      ref="audio"
      :src="music"
      class="audio"
      @pause="handlePause"
      @play="handlePlay"
      @timeupdate="handleTimeUpdate"
      @ended="handleEnded"
    ></audio>
  </div>
</template>

<style lang="scss" scoped>
:global(body) {
  margin: 0;
  font-size: 10vmin;
}
.app {
  --foreground: black;
  --background: white;
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  transition: background 0.5s, color 0.5s;
  @media (prefers-color-scheme: dark) {
    --foreground: white;
    --background: black;
    color: white;
  }
  &:not(.is-vibrant) {
    background-color: var(--background);
  }
}
@keyframes shake {
  0% {
    transform: rotate3d(1, 1, 1, 2deg);
  }
  50% {
    transform: rotate3d(-1, -1, -1, 2deg);
  }
  100% {
    transform: rotate3d(1, 1, 1, 2deg);
  }
}
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  perspective: 100vmin;
  transition: opacity 1s, filter 1s;
  animation: shake 3s ease-in-out infinite;
  &.is-distant {
    opacity: 0.5;
    filter: blur(0.1em);
  }
}
.lyric {
  position: absolute;
  transition: background 0.5s, color 0.5s, transform 1s ease-in-out, opacity 1s ease-in-out, filter 1s ease-in-out;
}
.prev, .next {
  opacity: 0.25;
  filter: blur(0.075em);
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
}
.next {
  animation: fade-in 1s ease-in-out;
}
.searcher {
  position: fixed;
  top: 50vh;
  left: 50vw;
  color: var(--foreground);
  transform: translate(-50%, -50%);
  transition: color 0.5s;
  animation: fade-in 0.5s ease-in-out;
}
.searcher-input {
  appearance: none;
  width: 50vw;
  border: none;
  border-bottom: 2px solid;
  color: inherit;
  font: inherit;
  text-align: center;
  background: transparent;
  border-image-source: linear-gradient(to right, currentColor, currentColor);
  border-image-slice: 1;
  outline: none;
  transition: border-image-source 0.5s;
  &:read-only {
    border-image-source: linear-gradient(to right, transparent, currentColor, transparent);
  }
}
.searcher-bar {
  display: flex;
  gap: 1em;
  justify-content: center;
  align-items: center;
  height: 1em;
  font-size: 48px;
}
.vendor-list {
  display: flex;
  justify-content: center;
  align-items: center;
}
.vendor-item {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 1em;
  height: 1em;
  opacity: 0.25;
  filter: grayscale(1);
  transition: opacity 0.4s;
  cursor: pointer;
  &.is-active {
    opacity: 1;
  }
}
.vendor-icon {
  width: 0.5em;
  height: 0.5em;
}
.audio {
  display: none;
}
.control-bar {
  position: fixed;
  top: 0.5em;
  left: 0.5em;
  display: flex;
  flex-wrap: wrap;
  max-width: calc(100vw - 1em);
  color: var(--foreground);
  font-size: 48px;
  border-radius: 1em;
  opacity: 0;
  transition: color 0.5s, opacity 0.4s;
  &:hover,
  &.is-resident {
    opacity: 1;
  }
}
.control-item {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 1em;
  height: 1em;
  opacity: 0.5;
  transition: opacity 0.2s;
  cursor: pointer;
  &:hover {
    opacity: 1;
  }
  &.move {
    -webkit-app-region: drag;
  }
}
</style>
