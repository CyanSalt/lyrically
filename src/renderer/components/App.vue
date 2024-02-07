<script lang="ts" setup>
import { useDocumentVisibility, useIdle, useTitle } from '@vueuse/core'
import { average } from 'color.js'
import { colord } from 'colord'
import { difference, findLastIndex } from 'lodash-es'
import { LucideBlend, LucideCloudFog, LucideMaximize, LucideMinimize, LucideMoon, LucideMove, LucideMusic, LucidePause, LucidePin, LucidePlay, LucideSun, LucideX } from 'lucide-vue-next'
import seedrandom from 'seedrandom'
import type { CSSProperties } from 'vue'
import { nextTick, watchEffect } from 'vue'
import { useAlwaysOnTop, useDarkMode, useDisplaySleepPrevented, useFullscreen } from '../compositions/frame'
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

const appName = worldBridge.appName

const supportsVibrancy = checkVibrancySupport()

let isDark = $(useDarkMode())
let isFullscreen = $(useFullscreen())
let isAlwaysOnTop = $(useAlwaysOnTop())

let isTransparent = $ref(supportsVibrancy)
let isGradientEnabled = $ref(false)

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
  const weights = segments.map(item => item.weight ?? 1)
  const maxWeight = Math.max(...weights)
  if (maxWeight <= 0) return text
  const lengths = segments.map(item => (item.weight === maxWeight ? item.segment.length : 0))
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
  if (!pictureColor) return !isDark
  return colord(pictureColor).isLight()
})

const isUsingGradient = $computed(() => {
  return isGradientEnabled && Boolean(pictureURL)
})

const isUsingDarkGradient = $computed(() => {
  return isUsingGradient && !isLightPicture
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
  const rng = seedrandom(lyric + key)
  const style: CSSProperties = {}
  if (typeof lyric !== 'string') return style
  if (lyric && rng() < 0.2) {
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

const vendors = [
  KugouService,
  NeteaseService,
]

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
  isDark = !isDark
}

function toggleTransparent() {
  if (isGradientEnabled) {
    isGradientEnabled = false
    isTransparent = true
  } else {
    isTransparent = !isTransparent
  }
}

function toggleGradient() {
  isGradientEnabled = !isGradientEnabled
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

let title = $(useTitle())

watchEffect(() => {
  if (info) {
    title = [info.name, info.artists?.join(' & ')]
      .filter((item): item is string => typeof item === 'string')
      .join(' - ')
  } else {
    title = ''
  }
})
</script>

<template>
  <div
    :class="['app', {
      'is-dark': isDark || isUsingDarkGradient,
      'is-transparent': isTransparent,
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
        <div :class="['control-item', { 'is-active': isAlwaysOnTop }]" @click="toggleAlwaysOnTop">
          <LucidePin />
        </div>
      </div>
      <div class="control-area">
        <div class="control-item" @click="toggleDarkMode">
          <LucideSun v-if="isDark" />
          <LucideMoon v-else />
        </div>
        <div
          v-if="supportsVibrancy"
          :class="['control-item', { 'is-active': isTransparent && !isGradientEnabled }]"
          @click="toggleTransparent"
        >
          <LucideCloudFog />
        </div>
        <div
          v-if="pictureURL"
          :class="['control-item', { 'is-active': isGradientEnabled }]"
          @click="toggleGradient"
        >
          <LucideBlend />
        </div>
      </div>
    </div>
    <div :class="['player-info', { 'is-resident': !isPlaying }]">
      <div class="music-area">
        <div :class="['music-picture', { 'is-inverted': !isLightPicture }]" @click="play">
          <LucidePause v-if="isPlaying" />
          <LucidePlay v-else />
        </div>
        <div class="music-info">
          <input v-model="keyword" :readonly="isConnected" :placeholder="appName" class="music-name" @change="search">
          <div v-if="info" class="music-detail">
            <div class="artists">{{ info.artists?.join(' & ') }}</div>
            <div class="album">{{ info.album }}</div>
          </div>
        </div>
      </div>
      <div class="vendor-area">
        <div class="vendor-list">
          <div
            v-if="isConnectable"
            :class="['control-item', { 'is-active': isConnected }]"
            @click="connect"
          >
            <LucideMusic />
          </div>
        </div>
        <div class="vendor-list">
          <div
            v-for="(vendor, index) in vendors"
            :key="vendor.name"
            :class="['control-item', {
              'is-active': service === vendor,
              'is-disabled': !isConnected && !vendor.prepare,
            }]"
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
  --icon-size: clamp(12px, 5vmin, 24px);
  --active-background-opacity: 8%;
  position: relative;
  width: 100vw;
  height: 100vh;
  font-size: 10vmin;
  overflow: hidden;
  transition: background var(--effect-duration), color var(--effect-duration);
  &.is-dark {
    --foreground: white;
    --background: black;
    --active-background-opacity: 16%;
    color: white;
  }
  &:not(.is-transparent) {
    background-color: var(--background);
  }
  &.is-immersive {
    cursor: none;
  }
  :deep(.lucide) {
    width: 1em;
    height: 1em;
  }
  :deep(.slider) {
    position: fixed;
    bottom: 0;
    left: 50%;
    color: color-mix(in sRGB, currentColor var(--active-background-opacity), transparent);
    font-size: var(--icon-size);
    transform: translateX(-50%);
    transition: color var(--fade-duration);
    &:hover,
    .slider.is-active & {
      color: inherit;
    }
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
.player-info {
  position: fixed;
  right: 1em;
  bottom: 1em;
  left: 1em;
  display: flex;
  gap: 2em;
  justify-content: space-between;
  align-items: flex-end;
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
.music-area {
  display: flex;
  flex: auto;
  gap: 0.5em;
  min-width: 0;
}
.music-picture {
  --fallback-background: color-mix(in sRGB, var(--foreground) var(--active-background-opacity), var(--background) var(--active-background-opacity));
  position: relative;
  display: flex;
  flex: none;
  justify-content: center;
  align-items: center;
  width: 5em;
  height: 5em;
  color: black;
  transition: color var(--effect-duration);
  cursor: pointer;
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: var(--picture, linear-gradient(var(--fallback-background), var(--fallback-background)));
    background-size: contain;
    transition: opacity var(--fade-duration);
    pointer-events: none;
  }
  &.is-inverted {
    color: white;
  }
  :deep(.lucide) {
    z-index: 1;
    font-size: 1.5em;
    opacity: 0;
    transition: opacity var(--fade-duration);
  }
  &:hover {
    :deep(.lucide) {
      opacity: 1;
    }
    &::before {
      opacity: 0.5;
    }
  }
}
.music-info {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}
.music-name {
  appearance: none;
  width: 10em;
  padding: 0;
  border: none;
  border-bottom: 2px solid;
  color: inherit;
  font: inherit;
  line-height: 2em;
  background: transparent;
  border-image-source: linear-gradient(to right, currentColor, currentColor);
  border-image-slice: 1;
  outline: none;
  transition: border-image-source var(--effect-duration);
  &:read-only {
    border-image-source: linear-gradient(to right, currentColor, transparent);
  }
  &::placeholder {
    color: color-mix(in sRGB, var(--foreground) 25%, transparent);
    font-style: italic;
    transition: color var(--effect-duration);
  }
}
.music-detail {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  font-size: 0.75em;
  white-space: nowrap;
  opacity: 0.5;
}
.vendor-area {
  display: flex;
  flex: 10 10 auto;
  flex-wrap: wrap;
  gap: 2em;
  justify-content: flex-end;
  align-items: center;
  font-size: var(--icon-size);
}
.vendor-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25em;
  justify-content: flex-end;
  align-items: center;
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
  gap: 2em;
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
  gap: 0.25em;
  &:last-child {
    justify-content: flex-end;
  }
}
.control-item {
  --background-opacity: 0;
  --foreground-opacity: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 1.75em;
  height: 1.75em;
  color: color-mix(in sRGB, var(--foreground) var(--foreground-opacity), transparent);
  background-color: color-mix(in sRGB, var(--foreground) var(--background-opacity), transparent);
  border-radius: 0.5em;
  transition: color var(--interactive-duration), background-color var(--interactive-duration);
  cursor: pointer;
  &:hover {
    --background-opacity: var(--active-background-opacity);
    --foreground-opacity: 100%;
  }
  &.is-active {
    --background-opacity: var(--active-background-opacity);
  }
  &:active, &.is-active:hover {
    --background-opacity: calc(var(--active-background-opacity) * 1.5);
  }
  &.move {
    -webkit-app-region: drag;
  }
  .vendor-icon {
    filter: opacity(var(--foreground-opacity));
    transition: filter var(--interactive-duration);
  }
  &.is-active .vendor-icon {
    filter: opacity(1);
  }
}
</style>
