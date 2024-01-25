<script lang="ts" setup>
import { useDocumentVisibility, useIdle } from '@vueuse/core'
import { average } from 'color.js'
import { colord } from 'colord'
import { difference, findLastIndex } from 'lodash-es'
import { LucideCloud, LucideCloudOff, LucideDna, LucideDnaOff, LucideMaximize, LucideMinimize, LucideMonitor, LucideMonitorOff, LucideMonitorPause, LucideMonitorPlay, LucideMoon, LucideMove, LucidePause, LucidePin, LucidePinOff, LucidePlay, LucideSun, LucideX } from 'lucide-vue-next'
import seedrandom from 'seedrandom'
import type { CSSProperties } from 'vue'
import { nextTick, watchEffect } from 'vue'
import { useAlwaysOnTop, useDarkMode, useDisplaySleepPrevented, useFullscreen, useVibrancy } from '../compositions/frame'
import { useKeyboardShortcuts } from '../compositions/interactive'
import { checkConnectable, getConnectedData, pauseConnected, playConnected } from '../utils/connection'
import { checkVibrancySupport } from '../utils/frame'
import { parseLRC } from '../utils/lrc'
import type { Segmenter } from '../utils/string'
import { defaultSegmenter, escapeHTML, getChineseSegmenter, isChineseText } from '../utils/string'
import KugouService from '../vendors/kugou'
import NeteaseService from '../vendors/netease'
import type { MusicData, MusicInfo, MusicService } from '../vendors/types'
import GradientAnimation from './GradientAnimation.vue'
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

function highlightSegments(text: string, segmenter: Segmenter | undefined) {
  if (!segmenter) return text
  const segments = segmenter(text)
  const lengths = segments.map(item => (item.isWordLike ? item.segment.length : 0))
  const maxLength = Math.max(...lengths)
  if (maxLength <= 0) return text
  const maxLengthIndexes = Array.from(lengths.entries())
    .filter(([index, value]) => value === maxLength)
    .map(([index, item]) => index)
  const rv = seedrandom(text)()
  const luckyIndex = maxLengthIndexes[Math.floor(rv * maxLengthIndexes.length)]
  return segments.map((item, index) => {
    return index === luckyIndex ? `<strong>${escapeHTML(item.segment)}</strong>` : escapeHTML(item.segment)
  }).join('')
}

const pictureURL = $computed(() => {
  if (!data || !data.picture) return undefined
  return `url("${data.picture}")`
})

let pictureColor = $ref<string>()

watchEffect(async () => {
  pictureColor = undefined
  if (!data || !data.picture) return
  pictureColor = await average(data.picture, { format: 'hex' }) as string
})

const isLightPicture = $computed(() => {
  if (!pictureColor) return false
  return colord(pictureColor).isLight()
})

let segmenter = $ref<Segmenter>()

watchEffect(async () => {
  const lyricText = lyrics.map(lyric => lyric.text).join('')
  if (isChineseText(lyricText)) {
    segmenter = undefined
    segmenter = await getChineseSegmenter()
  } else {
    segmenter = defaultSegmenter
  }
})

const lyricHTML = $computed(() => {
  return lyrics.map((lyric, index) => {
    return pictureURL && !lyric.text.trim() && durations[index] > 5
      ? `<div class="picture"></div>`
      : highlightSegments(lyric.text, segmenter)
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
  const rv = seedrandom(lyric + key)()
  if (lyric && rv < 0.2) {
    style.background = 'var(--foreground)'
    style.color = 'var(--background)'
  }
  const rand = seedrandom(lyric + key + type)
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

useKeyboardShortcuts(event => {
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

useDisplaySleepPrevented(() => {
  return isPlaying && visibility === 'visible'
})

let isGradientEnabled = $ref(false)

const isUsingGradient = $computed(() => {
  return isGradientEnabled && Boolean(pictureURL)
})

const isUsingDarkGradient = $computed(() => {
  return isUsingGradient && !isLightPicture
})

function toggleGradient() {
  isGradientEnabled = !isGradientEnabled
}
</script>

<template>
  <div
    :class="['app', {
      'is-dark': darkMode || isUsingDarkGradient,
      'is-vibrant': vibrancy && !isUsingGradient,
      'is-immersive': isPlaying && idle,
    }]"
    :style="{ '--picture': pictureURL }"
  >
    <Transition name="fade">
      <GradientAnimation v-if="isUsingGradient" :animated="isPlaying" />
    </Transition>
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
          <LucideCloudOff v-if="vibrancy" />
          <LucideCloud v-else />
        </div>
        <div v-if="pictureURL" class="control-item style" @click="toggleGradient">
          <LucideDnaOff v-if="isGradientEnabled" />
          <LucideDna v-else />
        </div>
      </div>
    </div>
    <div :class="['searcher', { 'is-resident': !isPlaying }]">
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
    <Transition name="fade">
      <Slider v-if="data && !isPlaying" v-model="offsetTime" />
    </Transition>
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--fade-duration);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.app {
  --foreground: black;
  --background: white;
  --fade-duration: 0.4s;
  --effect-duration: 0.5s;
  --lyric-duration: 1s;
  --interactive-duration: 0.2s;
  --icon-size: clamp(12px, 5vw, 24px);
  position: relative;
  width: 100vw;
  height: 100vh;
  font-size: 10vmin;
  overflow: hidden;
  transition: background var(--effect-duration), color var(--effect-duration);
  &.is-dark {
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
    font-size: calc(var(--icon-size) * 2);
    transform: translateX(-50%);
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
  transition: opacity var(--lyric-duration), filter var(--lyric-duration);
  animation: shake 3s ease-in-out infinite;
  &.is-distant {
    opacity: 0.5;
    filter: blur(0.1em);
  }
}
.lyric {
  position: absolute;
  transition: background var(--effect-duration), color var(--effect-duration), transform var(--lyric-duration) ease-in-out, opacity var(--lyric-duration) ease-in-out, filter var(--lyric-duration) ease-in-out;
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
@keyframes fade-in {
  from {
    opacity: 0;
  }
}
.next {
  animation: fade-in var(--lyric-duration) ease-in-out;
}
.searcher {
  position: fixed;
  top: 50vh;
  left: 50vw;
  color: var(--foreground);
  opacity: 0;
  transform: translate(-50%, -50%);
  transition: color var(--effect-duration), opacity var(--fade-duration);
  &.is-resident {
    opacity: 1;
  }
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
  transition: border-image-source var(--effect-duration);
  &:read-only {
    border-image-source: linear-gradient(to right, transparent, currentColor, transparent);
  }
}
.searcher-bar {
  display: flex;
  gap: 2em;
  justify-content: center;
  align-items: center;
  height: 2em;
  font-size: var(--icon-size);
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
  width: 2em;
  height: 2em;
  opacity: 0.25;
  filter: grayscale(1);
  transition: opacity var(--interactive-duration);
  cursor: pointer;
  &.is-active {
    opacity: 1;
  }
}
.vendor-icon {
  width: 1em;
  height: 1em;
  background-color: var(--foreground);
  mask-image: var(--icon);
  transition: background-color var(--effect-duration);
}
.audio {
  display: none;
}
.control-bar {
  position: fixed;
  top: 1em;
  right: 1em;
  left: 1em;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  max-width: calc(100vw - 2em);
  color: var(--foreground);
  font-size: var(--icon-size);
  opacity: 0;
  transition: color var(--effect-duration), opacity var(--fade-duration);
  &:hover,
  &.is-resident {
    opacity: 1;
  }
}
.control-area {
  display: flex;
  flex-wrap: wrap;
  &:last-child {
    justify-content: flex-end;
  }
}
.control-item {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2em;
  height: 2em;
  opacity: 0.5;
  transition: opacity var(--interactive-duration);
  cursor: pointer;
  &:hover {
    opacity: 1;
  }
  &.move {
    -webkit-app-region: drag;
  }
  :deep(.lucide) {
    width: 1em;
    height: 1em;
  }
}
</style>
