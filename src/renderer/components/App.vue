<script lang="ts" setup>
import { useDocumentVisibility, useIdle } from '@vueuse/core'
import { difference, findLastIndex } from 'lodash-es'
import { LucideCloud, LucideCloudOff, LucideMaximize, LucideMinimize, LucideMonitor, LucideMonitorOff, LucideMonitorPause, LucideMonitorPlay, LucideMoon, LucideMove, LucidePause, LucidePin, LucidePinOff, LucidePlay, LucideSun, LucideX } from 'lucide-vue-next'
import type { CSSProperties } from 'vue'
import { nextTick, watchEffect } from 'vue'
import { useAlwaysOnTop, useDarkMode, useFullscreen, useVibrancy } from '../compositions/frame'
import { checkConnectable, getConnectedData, pauseConnected, playConnected } from '../utils/connection'
import { checkVibrancySupport } from '../utils/frame'
import { getHashCode, LCG } from '../utils/helper'
import { parseLRC } from '../utils/lrc'
import { escapeHTML, splitSegments } from '../utils/string'
import KugouService from '../vendors/kugou'
import NeteaseService from '../vendors/netease'
import type { MusicData, MusicInfo, MusicService } from '../vendors/types'
import Slider from './Slider.vue'

let darkMode = $(useDarkMode())
let isFullscreen = $(useFullscreen())
let vibrancy = $(useVibrancy())
let isAlwaysOnTop = $(useAlwaysOnTop())

let isPlaying = $ref(false)
let currentTime = $ref(0)
let offsetTime = $ref(0)
let service = $shallowRef<MusicService<any, any>>(KugouService)
let keyword = $ref('')
let info = $ref<MusicInfo>()
let data = $ref<MusicData<any>>()
let music = $ref<string>()

let isConnected = $ref(false)
let connectedInfo = $ref<MusicInfo>()
let connectedSong = $ref<any>()

const audio = $ref<HTMLAudioElement>()

const playingTime = $computed(() => currentTime + offsetTime)

const lyrics = $computed(() => {
  if (!data) return []
  return parseLRC(data.lyric)
})

const durations = $computed(() => {
  return lyrics.map((lyric, index) => {
    if (index === lyrics.length - 1) return 0
    return lyrics[index + 1].time - lyric.time
  })
})

function highlightSegments(text: string) {
  const segments = splitSegments(text)
  const lengths = segments.map(item => (item.isWordLike ? item.segment.length : 0))
  const maxLength = Math.max(...lengths)
  if (maxLength <= 0) return text
  const maxLengthIndexes = Array.from(lengths.entries())
    .filter(([index, value]) => value === maxLength)
    .map(([index, item]) => index)
  const rv = LCG(getHashCode(text))()
  const luckyIndex = maxLengthIndexes[Math.floor(rv * maxLengthIndexes.length)]
  return segments.map((item, index) => {
    return index === luckyIndex ? `<strong>${escapeHTML(item.segment)}</strong>` : escapeHTML(item.segment)
  }).join('')
}

const pictureURL = $computed(() => {
  if (!data || !data.picture) return undefined
  return `url("${data.picture}")`
})

const lyricHTML = $computed(() => {
  return lyrics.map((lyric, index) => {
    return pictureURL && !lyric.text.trim() && durations[index] > 5
      ? `<div class="picture"></div>`
      : highlightSegments(lyric.text)
  })
})

const ANIMATION_TIME = 1
const CONNECTING_INTERVAL_TIME = 1

const currentIndex = $computed(() => {
  return findLastIndex(lyrics, row => playingTime >= (row.time - ANIMATION_TIME))
})

// for performance
const lastIndex = $computed(() => {
  return findLastIndex(lyrics, row => playingTime + CONNECTING_INTERVAL_TIME >= (row.time - ANIMATION_TIME))
})

const firstIndex = $computed(() => {
  return findLastIndex(lyrics, row => playingTime - CONNECTING_INTERVAL_TIME >= (row.time - ANIMATION_TIME))
})

const indexes = $computed(() => {
  let fromIndex = firstIndex
  let toIndex = lastIndex
  if (fromIndex === -1 && currentIndex > 0) {
    fromIndex = currentIndex - 1
  }
  if (toIndex === -1) {
    if (fromIndex === -1) return []
    toIndex = lyrics.length - 1
  }
  // `fromIndex` could be equal with `currentIndex`
  if (toIndex === currentIndex && currentIndex >= 0 && currentIndex < lyrics.length - 1) {
    toIndex = currentIndex + 1
  }
  return Array.from({ length: toIndex - fromIndex + 1 }, (_, index) => firstIndex + index)
})

const classes = $computed(() => {
  return indexes.map(index => {
    if (index < currentIndex) return 'prev'
    if (index > currentIndex) return 'next'
    return 'current'
  })
})

const types = $computed(() => {
  return indexes.map(index => {
    if (index < currentIndex) return 'outside'
    if (index > currentIndex) return 'edge'
    return 'inside'
  })
})

function generateStyle(lyric: string | undefined, key: string, type: 'edge' | 'inside' | 'outside') {
  const style: CSSProperties = {}
  if (typeof lyric !== 'string') return style
  const rv = LCG(getHashCode(lyric + key))()
  if (lyric && rv < 0.2) {
    style.background = 'var(--foreground)'
    style.color = 'var(--background)'
  }
  const rand = LCG(getHashCode(lyric + key + type))
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
  return indexes.map((index, order) => {
    return generateStyle(lyrics[index]?.text, String(index), types[order])
  })
})

const allVendors = [
  KugouService,
  NeteaseService,
]

const vendors = $computed(() => {
  if (isConnected) return allVendors
  return allVendors.filter(vendor => vendor.prepare)
})

const vendorIconURLs = $computed(() => {
  return vendors.map(vendor => `url("${vendor.icon}")`)
})

function close() {
  worldBridge.close()
}

function toggleFullscreen() {
  isFullscreen = !isFullscreen
}

function toggleDarkMode() {
  darkMode = !darkMode
}

const supportsVibrancy = checkVibrancySupport()

function toggleVibrancy() {
  vibrancy = vibrancy ? undefined : 'hud'
}

function toggleAlwaysOnTop() {
  isAlwaysOnTop = !isAlwaysOnTop
}

function play() {
  if (isConnected) {
    if (isPlaying) {
      pauseConnected()
    } else {
      playConnected()
    }
    return
  }
  if (!music) return
  if (!audio) return
  if (audio.paused) {
    audio.play()
  } else {
    audio.pause()
  }
}

watchEffect(onInvalidate => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.target === document.body) {
      switch (event.key) {
        case ' ':
          event.preventDefault()
          play()
          break
        case 'Escape':
          if (isFullscreen) {
            event.preventDefault()
            isFullscreen = false
          }
          break
      }
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  onInvalidate(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
})

const isConnectable = checkConnectable()

function connect() {
  isConnected = !isConnected
}

async function prepare(song: any, detail: any, autoplay = false) {
  music = await service.prepare?.(song, detail)
  if (!music) return
  if (autoplay) {
    currentTime = 0
    offsetTime = 0
  }
  await nextTick()
  if (audio) {
    if (autoplay) {
      audio.play()
    } else {
      audio.currentTime = currentTime
    }
  }
}

function unload() {
  info = undefined
  data = undefined
  music = undefined
  connectedSong = undefined
}

async function load(query: string, properties?: MusicInfo) {
  unload()
  const songs = await service.search(query)
  const song = songs.find(item => {
    const transformed = service.transform(item)
    if (properties?.album && transformed.album !== properties.album) return false
    if (properties?.artists && difference(properties.artists, transformed.artists ?? []).length) return false
    return true
  }) ?? songs[0]
  if (!song) return
  info = service.transform(song)
  data = await service.load(song)
  if (properties) {
    connectedSong = song
  } else {
    await prepare(song, data.detail, true)
  }
}

function search(event: InputEvent) {
  const query = (event.target as HTMLInputElement).value
  if (query) {
    load(query)
  }
}

function activate(vendor: MusicService<any, any>) {
  const oldService = service
  service = vendor
  if (service !== oldService && keyword) {
    load(keyword, connectedInfo)
  }
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

function reset() {
  isPlaying = false
  connectedInfo = undefined
}

watchEffect(onInvalidate => {
  if (isConnected) {
    const timer = setInterval(async () => {
      const result = await getConnectedData()
      if (result) {
        isPlaying = result.isPlaying
        currentTime = result.currentTime
        if (!connectedInfo || connectedInfo.key !== result.info.key || connectedInfo.name !== result.info.name) {
          connectedInfo = result.info
          keyword = result.info.name
          load(keyword, connectedInfo)
        }
      } else {
        reset()
        unload()
      }
    }, 1000 * CONNECTING_INTERVAL_TIME)
    onInvalidate(() => {
      clearInterval(timer)
    })
  } else {
    reset()
    if (connectedSong && data) {
      prepare(connectedSong, data.detail)
      connectedSong = undefined
    }
  }
})

let { idle } = $(useIdle(5000))
const visibility = $(useDocumentVisibility())

watchEffect(async onInvalidate => {
  if (isPlaying && visibility === 'visible') {
    const dispose = worldBridge.preventDisplaySleep()
    onInvalidate(dispose)
  }
})
</script>

<template>
  <div
    :class="['app', { 'is-vibrant': vibrancy, 'is-immersive': isPlaying && idle }]"
    :style="{ '--picture': pictureURL }"
  >
    <div :class="['container', { 'is-distant': !isPlaying }]">
      <div
        v-for="(index, order) in indexes"
        :key="index"
        :style="styles[order]"
        :class="[classes[order], 'lyric']"
        v-html="lyricHTML[index] ?? ''"
      ></div>
    </div>
    <div :class="['control-bar', { 'is-resident': !isPlaying }]">
      <div class="control-area">
        <div class="control-item move">
          <LucideMove />
        </div>
        <div class="control-item" @click="close">
          <LucideX />
        </div>
        <div class="control-item" @click="toggleFullscreen">
          <LucideMinimize v-if="isFullscreen" />
          <LucideMaximize v-else />
        </div>
        <div class="control-item" @click="toggleAlwaysOnTop">
          <LucidePinOff v-if="isAlwaysOnTop" />
          <LucidePin v-else />
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
      <div class="control-area">
        <div class="control-item style" @click="toggleDarkMode">
          <LucideSun v-if="darkMode" />
          <LucideMoon v-else />
        </div>
        <div v-if="supportsVibrancy" class="control-item style" @click="toggleVibrancy">
          <LucideCloud v-if="vibrancy" />
          <LucideCloudOff v-else />
        </div>
      </div>
    </div>
    <div v-if="!isPlaying" class="searcher">
      <input v-model="keyword" :readonly="isConnected" class="searcher-input" @change="search">
      <div class="searcher-bar">
        <div v-if="isConnectable" class="control-item" @click="connect">
          <LucideMonitorOff v-if="isConnected" />
          <LucideMonitor v-else />
        </div>
        <div class="vendor-list">
          <div
            v-for="(vendor, index) in vendors"
            :key="vendor.name"
            :class="['vendor-item', { 'is-active': service === vendor }]"
            :style="{ '--icon': vendorIconURLs[index] }"
            :data-icon="vendor.icon"
            @click="activate(vendor)"
          >
            <div class="vendor-icon"></div>
          </div>
        </div>
      </div>
    </div>
    <Slider v-if="data && !isPlaying" v-model="offsetTime" />
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
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
}
.app {
  --foreground: black;
  --background: white;
  position: relative;
  width: 100vw;
  height: 100vh;
  font-size: 10vmin;
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
  &.is-immersive {
    cursor: none;
  }
  :deep(.slider) {
    position: fixed;
    bottom: 1em;
    left: 50%;
    font-size: 48px;
    transform: translateX(-50%);
    transition: opacity 0.4s;
    animation: fade-in 0.5s ease-in-out;
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
  :deep(strong) {
    font-weight: 900;
    font-size: 1.25em;
  }
  :deep(.picture) {
    width: 5em;
    height: 5em;
    background-image: var(--picture);
    background-position: center;
    background-size: contain;
    background-repeat: no-repeat;
  }
}
.prev, .next {
  opacity: 0.25;
  filter: blur(0.075em);
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
  background-color: var(--foreground);
  mask-image: var(--icon);
  transition: background-color 0.5s;
}
.audio {
  display: none;
}
.control-bar {
  position: fixed;
  top: 0.5em;
  right: 0.5em;
  left: 0.5em;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  max-width: calc(100vw - 1em);
  color: var(--foreground);
  font-size: 48px;
  opacity: 0;
  transition: color 0.5s, opacity 0.4s;
  &:hover,
  &.is-resident {
    opacity: 1;
  }
}
.control-area {
  display: flex;
  flex-wrap: wrap;
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
