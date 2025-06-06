<script lang="ts" setup>
import { useDocumentVisibility, useIdle, useTitle, useWindowSize } from '@vueuse/core'
import { average } from 'color.js'
import { colord } from 'colord'
import { difference, findLastIndex, isEqual } from 'lodash-es'
import { LucideBlend, LucideCloudFog, LucideMaximize, LucideMinimize, LucideMoon, LucidePanelTopClose, LucidePause, LucidePictureInPicture, LucidePin, LucidePlay, LucideRotate3D, LucideSearch, LucideSun, LucideX } from 'lucide-vue-next'
import seedrandom from 'seedrandom'
import { siApplemusic } from 'simple-icons'
import type { CSSProperties, Ref } from 'vue'
import { nextTick, toRaw, watch, watchEffect } from 'vue'
import { useAlwaysOnTop, useDarkMode, useDisplaySleepPrevented, useFullscreen } from '../compositions/frame'
import { useKeyboardShortcuts } from '../compositions/interactive'
import { checkConnectable, pauseConnected, playConnected, subscribeConnection } from '../utils/connection'
import { checkExternalSearchAvailable, openExternalNowPlaying, openExternalSearch } from '../utils/external'
import { checkVibrancySupport } from '../utils/frame'
import { parseLRC } from '../utils/lrc'
import { getSVGShape } from '../utils/notch'
import type { Segmenter } from '../utils/string'
import { defaultSegmenter, getChineseSegmenter, isChineseText } from '../utils/string'
import KugouService from '../vendors/kugou'
// import LrclibService from '../vendors/lrclib'
import NeteaseService from '../vendors/netease'
import type { MusicData, MusicInfo, MusicService } from '../vendors/types'
import GradientAnimation from './GradientAnimation.vue'
import Slider from './Slider.vue'

const {
  appName,
  isNotchAvailable,
  isNotchWindow,
  notchAreaWidth,
  notchAreaHeight,
  initialState,
} = worldBridge

const supportsVibrancy = checkVibrancySupport()
const isConnectable = checkConnectable()

let isDark = $(useDarkMode())
let isFullscreen = $(useFullscreen())
let isAlwaysOnTop = $(useAlwaysOnTop())

let isTransparent = $ref(supportsVibrancy)
let isGradientEnabled = $ref(!supportsVibrancy)
let isCompact = $ref(isNotchWindow)
let isCollapsed = $ref(false)

let isPlaying = $ref(false)
let currentTime = $ref(0)
let offsetTime = $ref(0)
let vendor = $ref<string>()
let keyword = $ref('')
let candidates = $ref<any[]>([])
let selectedIndex = $ref(-1)
let data = $ref<MusicData<any>>()
let music = $ref<string>()

let isConnected = $ref(false)
let connectedInfo = $ref<MusicInfo>()
let connectedSong = $ref<any>()

const defaultState = {
  isTransparent: supportsVibrancy,
  isGradientEnabled: !supportsVibrancy,
  isCompact: isNotchWindow,
  isCollapsed: false,
  isPlaying: false,
  currentTime: 0,
  offsetTime: 0,
  // eslint-disable-next-line vue/no-ref-object-reactivity-loss
  vendor: undefined as typeof vendor,
  keyword: '',
  candidates: [],
  selectedIndex: -1,
  // eslint-disable-next-line vue/no-ref-object-reactivity-loss
  data: undefined as typeof data,
  music: '',
  isConnected: false,
  // eslint-disable-next-line vue/no-ref-object-reactivity-loss
  connectedInfo: undefined as typeof connectedInfo,
  // eslint-disable-next-line vue/no-ref-object-reactivity-loss
  connectedSong: undefined as typeof connectedSong,
}

function mergeState<T extends object>(state: T, values: { [K in keyof T]: Ref<T[K]> }, defaults: Partial<T>) {
  for (const [key, value] of Object.entries<Ref<unknown>>(values)) {
    const raw = toRaw(value.value)
    if (!(key in defaults) || !isEqual(raw, defaults[key])) {
      state[key] = raw
    }
  }
}

function setDefaults<T extends object>(values: { [K in keyof T]: Ref<T[K]> }, defaults: Partial<T>) {
  for (const [key, value] of Object.entries<Ref<unknown>>(values)) {
    if (key in defaults) {
      value.value = defaults[key]
    }
  }
}

function buildState() {
  const state = {
    ...initialState,
  }
  mergeState(state, $$({
    isDark,
    isGradientEnabled,
    isCompact,
    isPlaying,
    currentTime,
    offsetTime,
    vendor,
    keyword,
    candidates,
    selectedIndex,
    data,
    music,
  }), defaultState)
  if (isNotchWindow) {
    mergeState(state, $$({
      isCollapsed,
    }), defaultState)
  } else {
    mergeState(state, $$({
      isFullscreen,
      isAlwaysOnTop,
    }), defaultState)
  }
  if (supportsVibrancy) {
    mergeState(state, $$({
      isTransparent,
    }), defaultState)
  }
  if (isConnectable) {
    mergeState(state, $$({
      isConnected,
      connectedInfo,
      connectedSong,
    }), defaultState)
  }
  return state
}

if (initialState) {
  setDefaults($$({
    isDark,
    isGradientEnabled,
    isCompact,
    isPlaying,
    currentTime,
    offsetTime,
    vendor,
    keyword,
    candidates,
    selectedIndex,
    data,
    music,
  }), initialState)
  if (isNotchWindow) {
    setDefaults($$({
      isCollapsed,
    }), initialState)
  } else {
    setDefaults($$({
      isFullscreen,
      isAlwaysOnTop,
    }), initialState)
  }
  if (supportsVibrancy) {
    setDefaults($$({
      isTransparent,
      isAlwaysOnTop,
    }), initialState)
  }
  if (isConnectable) {
    setDefaults($$({
      isConnected,
      connectedInfo,
      connectedSong,
    }), initialState)
  }
}

const audio = $ref<HTMLAudioElement>()

const vendors = [
  KugouService,
  NeteaseService,
  // LrclibService,
]

const service = $computed<MusicService<any, any>>(() => {
  return vendors.find(item => item.name === vendor) ?? vendors[0]
})

const info = $computed(() => {
  if (isConnected && connectedInfo) return connectedInfo
  const song = candidates[selectedIndex]
  if (!song) return undefined
  return service.transform(song)
})

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

interface BaseLyricNode {
  type: string,
}

interface PictureLyricNode extends BaseLyricNode {
  type: 'picture',
}

interface TextLyricNode extends BaseLyricNode {
  type: 'text',
  text: string,
  highlight: boolean,
}

type LyricNode = PictureLyricNode | TextLyricNode

function createTextLyricNode(text: string, highlight?: boolean): TextLyricNode {
  return {
    type: 'text',
    text,
    highlight: highlight ?? false,
  }
}

function highlightSegments(text: string, segmenter: Segmenter | undefined): LyricNode[] {
  if (!segmenter) return [createTextLyricNode(text)]
  const segments = segmenter(text)
  const weights = segments.map(item => item.weight ?? 1)
  const maxWeight = Math.max(...weights)
  if (maxWeight <= 0) return [createTextLyricNode(text)]
  const lengths = segments.map(item => (item.weight === maxWeight ? item.segment.length : 0))
  const maxLength = Math.max(...lengths)
  if (maxLength <= 0) return [createTextLyricNode(text)]
  const maxLengthIndexes = Array.from(lengths.entries())
    .filter(([index, value]) => value === maxLength)
    .map(([index, item]) => index)
  const rv = seedrandom(text)()
  const luckyIndex = maxLengthIndexes[Math.floor(rv * maxLengthIndexes.length)]
  return segments.map((item, index) => createTextLyricNode(item.segment, index === luckyIndex))
}

const pictureURL = $computed(() => {
  const artwork = info?.artwork
  if (artwork) return artwork
  if (!data) return undefined
  return data.picture
})

const pictureImage = $computed(() => {
  if (!pictureURL) return undefined
  return `url("${pictureURL}")`
})

let pictureColor = $ref<string>()

watchEffect(async () => {
  pictureColor = undefined
  if (!pictureURL) return
  pictureColor = await average(pictureURL, { format: 'hex' }) as string
})

const isLightPicture = $computed(() => {
  if (!pictureColor) return !isDark
  return colord(pictureColor).isLight()
})

const isUsingGradient = $computed(() => {
  return isGradientEnabled && Boolean(pictureImage)
})

const {
  width: innerWidth,
  height: innerHeight,
} = $(useWindowSize())

const notchMaskImage = $computed(() => {
  if (!isNotchWindow) return undefined
  return getSVGShape(innerWidth - 6 * 2, innerHeight, 12, 6)
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

const lyricNodes = $computed(() => {
  return lyrics.map<LyricNode[]>((lyric, index) => {
    return pictureImage && !lyric.text.trim() && durations[index] > 5
      ? [{ type: 'picture' }]
      : highlightSegments(lyric.text, segmenter)
  })
})

const ANIMATION_TIME = 1

const currentIndex = $computed(() => {
  return findLastIndex(lyrics, row => playingTime >= (row.time - ANIMATION_TIME))
})

// for performance
const lastIndex = $computed(() => {
  return findLastIndex(lyrics, row => playingTime + ANIMATION_TIME >= (row.time - ANIMATION_TIME))
})

const firstIndex = $computed(() => {
  return findLastIndex(lyrics, row => playingTime - ANIMATION_TIME >= (row.time - ANIMATION_TIME))
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

const basicClasses = $computed(() => {
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

const schemeClasses = $computed(() => {
  return indexes.map(index => {
    const lyric = lyrics[index]?.text
    const key = String(index)
    const rand = seedrandom(lyric + key)
    if (typeof lyric !== 'string') return 'normal'
    return lyric && rand() < 0.2
      ? 'highlight'
      : 'normal'
  })
})

function generateStyle(lyric: string | undefined, key: string, type: 'edge' | 'inside' | 'outside') {
  const style: CSSProperties = {}
  if (typeof lyric !== 'string') return style
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

function generateCompactStyle(type: 'edge' | 'inside' | 'outside') {
  const style: CSSProperties = {}
  if (type === 'outside') {
    style.transform = `translate(0.5em, 0.5em)`
  } else if (type === 'edge') {
    style.transform = `translate(0.25em, 0.25em)`
  } else {
    // pass
  }
  return style
}

const compactStyles = $computed(() => {
  return indexes.map((index, order) => {
    return generateCompactStyle(types[order])
  })
})

const vendorIconURLs = $computed(() => {
  return vendors.map(item => `url("${item.icon}")`)
})

const placeholder = $computed(() => `${appName}.`)

const applemusicIcon = $computed(() => {
  return `url("data:image/svg+xml,${encodeURIComponent(siApplemusic.svg)}")`
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

function toggleCompact() {
  isCompact = !isCompact
}

function toggleCollapsed() {
  isCollapsed = !isCollapsed
}

watchEffect(() => {
  if (isNotchWindow) {
    const iconHeight = notchAreaHeight / (1 + 1.75)
    const compactHeight = Math.ceil(((1 + 1.75 + 1) + 2 + (1 + 3 + 1)) * iconHeight)
    worldBridge.setBounds({
      height: isCollapsed ? notchAreaHeight : (isCompact ? compactHeight : notchAreaHeight * 6),
    })
  }
})

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

function connect() {
  isConnected = !isConnected
}

const isExternallySearchable = checkExternalSearchAvailable()

function searchExternally() {
  if (isConnected) {
    openExternalNowPlaying()
  } else {
    openExternalSearch(keyword)
  }
}

function toggleNotch() {
  const state = buildState()
  if (isNotchWindow) {
    worldBridge.openWindow(state)
  } else {
    worldBridge.openNotchWindow(state)
  }
  window.close()
}

async function prepare(song: any, detail: any, autoplay = false) {
  music = await service.prepare?.(song, detail)
  if (!music) return
  if (autoplay) {
    currentTime = 0
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
  candidates = []
  selectedIndex = -1
  data = undefined
  music = undefined
  connectedSong = undefined
  offsetTime = 0
}

async function load(query: string, properties?: MusicInfo) {
  unload()
  const result = await service.search(query)
  if (!result.length) return
  let matchedIndex = result.findIndex((item, index) => {
    const transformed = service.transform(item)
    if (properties?.album && transformed.album !== properties.album) return false
    if (properties?.artists && difference(properties.artists, transformed.artists ?? []).length) return false
    return true
  })
  if (matchedIndex === -1) {
    matchedIndex = 0
  }
  candidates = result
  selectedIndex = matchedIndex
  select(result[matchedIndex], Boolean(properties))
}

async function select(song: any, connecting = false) {
  data = await service.load(song)
  if (connecting) {
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
  if (isConnected && connectedInfo) {
    keyword = connectedInfo.name
  }
}

function toSuffix(values: (string | undefined)[], sep: string, prefix: string) {
  const suffix = values.filter((item): item is string => typeof item === 'string').join(sep)
  return suffix ? `${prefix}${suffix}` : ''
}

const listFormat = new Intl.ListFormat()

function formatList(values: string[] | undefined) {
  return Array.isArray(values) ? listFormat.format(values) : values
}

async function showCandidates(event: MouseEvent) {
  if (!candidates.length) return
  const pickedIndex = await worldBridge.select(candidates.map((song, index) => {
    const transformed = service.transform(song)
    return {
      type: 'radio',
      label: `${transformed.name}${toSuffix([formatList(transformed.artists), transformed.album], ' ', ' - ')}`,
      checked: index === selectedIndex,
    }
  }), event, selectedIndex)
  if (pickedIndex !== -1) {
    selectedIndex = pickedIndex
    select(candidates[pickedIndex], isConnected)
  }
}

function activate(name: string) {
  vendor = name
}

watch($$(service), () => {
  if (keyword) {
    load(keyword, connectedInfo)
  }
})

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
    const disconnect = subscribeConnection({
      onTimeUpdate: time => {
        currentTime = time
      },
      onChange: result => {
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
      },
    })
    onInvalidate(() => {
      disconnect()
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
    title = [info.name, formatList(info.artists)]
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
      'is-dark': isDark || isUsingGradient || isNotchWindow,
      'is-transparent': isTransparent,
      'is-gradient': isUsingGradient,
      'is-immersive': isPlaying && idle,
      'is-notch': isNotchWindow,
      'is-compact': isCompact,
      'is-collapsed': isCollapsed,
    }]"
    :style="{
      '--picture-image': pictureImage,
      '--picture-color': pictureColor,
      '--notch-area-width': `${notchAreaWidth}px`,
      '--notch-area-height': `${notchAreaHeight}px`,
      '--notch-mask-image': notchMaskImage,
    }"
  >
    <Transition name="fade">
      <GradientAnimation v-if="isUsingGradient" :picture="pictureURL" :animated="isPlaying" />
    </Transition>
    <template v-if="!isCollapsed">
      <div :class="['container', { 'is-distant': !isPlaying }]">
        <template v-if="isCompact">
          <div
            v-for="(index, order) in indexes"
            :key="index"
            :style="compactStyles[order]"
            :class="[basicClasses[order], schemeClasses[order], 'lyric']"
          >{{ lyrics[index]?.text ?? '' }}</div>
        </template>
        <template v-else>
          <div
            v-for="(index, order) in indexes"
            :key="index"
            :style="styles[order]"
            :class="[basicClasses[order], schemeClasses[order], 'lyric']"
          >
            <template v-for="(node, nodeIndex) in lyricNodes[index] ?? []" :key="nodeIndex">
              <div v-if="node.type === 'picture'" class="picture"></div>
              <strong v-else-if="node.highlight">{{ node.text }}</strong>
              <template v-else>{{ node.text }}</template>
            </template>
          </div>
        </template>
      </div>
      <header :class="['control-bar', { 'is-resident': !isPlaying }]">
        <div class="control-area">
          <button class="control-item" @click="close">
            <LucideX />
          </button>
          <button v-if="!isNotchWindow" class="control-item" @click="toggleFullscreen">
            <LucideMinimize v-if="isFullscreen" />
            <LucideMaximize v-else />
          </button>
          <button v-if="isNotchAvailable" class="control-item" @click="toggleNotch">
            <LucidePictureInPicture v-if="isNotchWindow" />
            <LucidePanelTopClose v-else />
          </button>
          <button v-if="!isNotchWindow" :class="['control-item', { 'is-active': isAlwaysOnTop }]" @click="toggleAlwaysOnTop">
            <LucidePin />
          </button>
        </div>
        <div class="control-area top-move"></div>
        <div class="control-area center-move"></div>
        <div class="control-area">
          <button v-if="!isNotchWindow" class="control-item" @click="toggleDarkMode">
            <LucideSun v-if="isDark" />
            <LucideMoon v-else />
          </button>
          <button
            v-if="supportsVibrancy"
            :class="['control-item', { 'is-active': isTransparent && !isGradientEnabled }]"
            @click="toggleTransparent"
          >
            <LucideCloudFog />
          </button>
          <button
            :class="['control-item', { 'is-active': !isCompact }]"
            @click="toggleCompact"
          >
            <LucideRotate3D />
          </button>
          <button
            :disabled="!pictureImage"
            :class="['control-item', { 'is-active': isGradientEnabled }]"
            @click="toggleGradient"
          >
            <LucideBlend />
          </button>
        </div>
      </header>
    </template>
    <footer :class="['player-info', { 'is-resident': !isPlaying }]">
      <div class="music-area">
        <div :class="['music-picture', { 'is-inverted': !isLightPicture }]" @click="play">
          <LucidePause v-if="isPlaying" fill="currentColor" />
          <LucidePlay v-else fill="currentColor" />
        </div>
        <div v-if="!isCollapsed" class="music-info">
          <input
            v-model="keyword"
            :placeholder="placeholder"
            class="music-name"
            @change="search"
          >
          <a v-if="info" class="music-detail" @click="showCandidates">
            <div class="artists">{{ formatList(info.artists) }}</div>
            <div v-if="!isCompact" class="album">{{ info.album }}</div>
          </a>
        </div>
      </div>
      <div v-if="!isCollapsed" class="vendor-area">
        <div class="vendor-list">
          <button
            v-if="isConnectable"
            :class="['control-item', { 'is-active': isConnected }]"
            :style="{ '--icon': applemusicIcon }"
            @click="connect"
          >
            <div class="control-icon"></div>
          </button>
          <button
            v-if="isExternallySearchable"
            class="control-item"
            @click="searchExternally"
          >
            <LucideSearch />
          </button>
        </div>
        <div class="vendor-list">
          <button
            v-for="(item, index) in vendors"
            :key="item.name"
            :disabled="!isConnected && !item.prepare"
            :class="['control-item', {
              'is-active': service === item,
            }]"
            :style="{ '--icon': vendorIconURLs[index] }"
            @click="activate(item.name)"
          >
            <div class="control-icon"></div>
          </button>
        </div>
      </div>
    </footer>
    <template v-if="!isCollapsed">
      <Transition name="fade">
        <Slider v-if="data && !isPlaying" v-model="offsetTime" />
      </Transition>
    </template>
    <button v-if="isNotchWindow" class="notch-action" @click="toggleCollapsed"></button>
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
  --highlight-foreground: var(--background);
  --highlight-background: var(--foreground);
  --fade-duration: 0.4s;
  --effect-duration: 0.5s;
  --lyric-duration: 1s;
  --interactive-duration: 0.2s;
  --icon-size: clamp(14px, 5vmin, 24px);
  --active-background-opacity: 8%;
  --colorful-background-filter: brightness(133.3333%);
  --notch-x-offset: 0px;
  position: relative;
  box-sizing: border-box;
  width: 100vw;
  height: 100vh;
  font-size: 10vmin;
  overflow: hidden;
  transition: background var(--effect-duration), color var(--effect-duration), text-shadow var(--effect-duration);
  &.is-dark {
    --foreground: white;
    --background: black;
    --active-background-opacity: 16%;
    --colorful-background-filter: brightness(75%);
    color: white;
  }
  &:not(.is-transparent) {
    background-color: var(--background);
  }
  &.is-immersive {
    cursor: none;
  }
  &.is-gradient {
    --highlight-foreground: oklab(from var(--picture-color,) calc(l * 80%) a b);
  }
  &.is-notch {
    --notch-x-offset: 6px;
    --icon-size: calc(var(--notch-area-height) / #{1 + 1.75});
    padding: 0 var(--notch-x-offset);
    mask-image: var(--notch-mask-image);
  }
  &.is-collapsed {
    --icon-size: calc(var(--notch-area-height) * 2 / 3 / 1.75);
  }
  :deep(.gradient-animation) {
    filter: var(--colorful-background-filter);
  }
  :deep(.lucide) {
    width: 1em;
    height: 1em;
  }
  :deep(.slider) {
    --guide-line-size: min(0.4375em, 8px);
    position: fixed;
    bottom: 0;
    left: 50%;
    color: rgb(from currentColor r g b / var(--active-background-opacity));
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
    // transform: rotate3d(1, 1, 1, 2deg);
    transform: rotate(2deg);
  }
  50% {
    // transform: rotate3d(-1, -1, -1, 2deg);
    transform: rotate(-2deg);
  }
  100% {
    // transform: rotate3d(1, 1, 1, 2deg);
    transform: rotate(2deg);
  }
}
.notch-action {
  --smoothie-border-radius: 12px;
  --smoothie-border-radius-smoothing: 0.6;
  appearance: none;
  position: fixed;
  top: 0;
  left: 50%;
  width: var(--notch-area-width);
  height: var(--notch-area-height);
  padding: 0;
  border: none;
  background: transparent;
  mask-image: paint(smoothie-mask);
  transform: translateX(-50%);
}
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  perspective: 100vmin;
  transition: opacity var(--lyric-duration), filter var(--lyric-duration);
  animation: shake 3s ease-in-out infinite;
  .app.is-gradient & {
    opacity: 0.9;
  }
  .app:not(.is-compact) &.is-distant {
    opacity: 0.5;
    filter: blur(0.1em);
  }
  .app.is-compact & {
    justify-content: flex-start;
    padding-inline: var(--icon-size);
    padding-top: calc(#{1 + 1.75 + 1} * var(--icon-size));
    padding-bottom: calc(#{1 + 3 + 1} * var(--icon-size));
    font-weight: 500;
    font-size: max(1em, 14px);
    animation: none;
  }
}
.lyric {
  position: absolute;
  font-weight: 500;
  transition: background var(--effect-duration), color var(--effect-duration), transform var(--lyric-duration) ease-in-out, opacity var(--lyric-duration) ease-in-out, filter var(--lyric-duration) ease-in-out;
  :deep(strong) {
    font-weight: 900;
    font-size: 1.25em;
  }
  :deep(.picture) {
    width: 5em;
    height: 5em;
    background-image: var(--picture-image);
    background-position: center;
    background-size: contain;
    background-repeat: no-repeat;
  }
  .app.is-compact &::first-letter {
    font-size: 1.25em;
    text-transform: uppercase;
  }
}
.prev, .next {
  opacity: 0.25;
  filter: blur(0.075em);
}
.app.is-compact .prev {
  opacity: 0;
}
.highlight {
  color: var(--highlight-foreground);
  text-shadow: none;
  background: var(--highlight-background);
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
  right: calc(1em + var(--notch-x-offset));
  bottom: 1em;
  left: calc(1em + var(--notch-x-offset));
  display: flex;
  gap: 2em;
  justify-content: space-between;
  align-items: flex-end;
  max-width: calc(100vw - 2 * calc(1em + var(--notch-x-offset)));
  color: var(--foreground);
  font-size: var(--icon-size);
  opacity: 0;
  transition: color var(--effect-duration), opacity var(--fade-duration), bottom var(--interactive-duration);
  &:hover,
  &.is-resident,
  .app.is-compact & {
    opacity: 1;
  }
  .app.is-collapsed & {
    bottom: calc((var(--notch-area-height) - var(--icon-size) * 1.75) / 2);
  }
}
.music-area {
  display: flex;
  flex: auto;
  gap: 0.5em;
  min-width: 0;
}
.music-picture {
  --fallback-background: rgb(from var(--foreground) r g b / var(--active-background-opacity));
  position: relative;
  display: flex;
  flex: none;
  justify-content: center;
  align-items: center;
  width: 5em;
  height: 5em;
  transition: color var(--effect-duration);
  cursor: pointer;
  container-type: size;
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: var(--picture-image, linear-gradient(var(--fallback-background), var(--fallback-background)));
    background-position: center;
    background-size: contain;
    background-repeat: no-repeat;
    transition: opacity var(--fade-duration), width var(--interactive-duration), height var(--interactive-duration);
    pointer-events: none;
  }
  &.is-inverted {
    color: white;
  }
  .app.is-compact & {
    width: 3em;
    height: 3em;
  }
  .app.is-collapsed & {
    width: calc(var(--icon-size) * 1.75);
    height: calc(var(--icon-size) * 1.75);
  }
  :deep(.lucide) {
    z-index: 1;
    font-size: max(30cqmin, calc(var(--icon-size) * 1.5));
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
  gap: #{0.75em * 0.25};
}
.music-name {
  appearance: none;
  padding: 0;
  border: none;
  color: inherit;
  font: inherit;
  font-weight: 500;
  background: transparent;
  outline: none;
  field-sizing: content;
  &::placeholder {
    color: rgb(from var(--foreground) r g b / 25%);
    font-style: italic;
    transition: color var(--effect-duration);
  }
}
.music-detail {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  color: rgb(from var(--foreground) r g b / 50%);
  font-size: 0.75em;
  white-space: nowrap;
  transition: color var(--effect-duration);
  cursor: pointer;
  .app.is-compact & {
    font-size: calc(1em - 1px);
  }
}
.vendor-area {
  display: flex;
  flex: 10 10 auto;
  flex-wrap: wrap;
  gap: 2em;
  justify-content: flex-end;
  align-items: center;
  font-size: var(--icon-size);
  .app.is-compact & {
    flex: none;
  }
}
.vendor-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25em;
  justify-content: flex-end;
  align-items: center;
  transition: opacity var(--fade-duration);
  .app.is-compact .player-info:not(.is-resident, :hover) & {
    opacity: 0;
  }
}
.audio {
  display: none;
}
.control-bar {
  position: fixed;
  top: 1em;
  right: calc(1em + var(--notch-x-offset));
  left: calc(1em + var(--notch-x-offset));
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  max-width: calc(100vw - 2 * calc(1em + var(--notch-x-offset)));
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
  &.top-move {
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    height: 1em;
    .app:not(.is-notch) & {
      -webkit-app-region: drag;
    }
  }
  &.center-move {
    flex: 1 1 2em;
    align-self: stretch;
    .app:not(.is-notch) & {
      -webkit-app-region: drag;
    }
  }
}
.control-item {
  --smoothie-border-radius: 0.5em;
  --smoothie-border-radius-smoothing: 0.6;
  --background-opacity: 0;
  --foreground-opacity: 50%;
  appearance: none;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 1.75em;
  height: 1.75em;
  padding: 0;
  border: none;
  color: rgb(from var(--foreground) r g b / var(--foreground-opacity));
  font: inherit;
  background-color: rgb(from var(--foreground) r g b / var(--background-opacity));
  mask-image: paint(smoothie-mask);
  transition: transform var(--interactive-duration), color var(--interactive-duration), background-color var(--interactive-duration);
  cursor: pointer;
  &:not(:disabled):hover {
    --background-opacity: var(--active-background-opacity);
    --foreground-opacity: 100%;
  }
  &:not(:disabled):active {
    transform: scale(0.96);
  }
  &.is-active {
    --background-opacity: var(--active-background-opacity);
  }
  &:not(:disabled):active, &:not(:disabled).is-active:hover {
    --background-opacity: calc(var(--active-background-opacity) * 1.5);
  }
  .control-icon {
    filter: opacity(var(--foreground-opacity));
  }
  &.is-active .control-icon {
    filter: opacity(1);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
.control-icon {
  width: 1em;
  height: 1em;
  background-color: var(--foreground);
  mask-image: var(--icon);
  transition: background-color var(--effect-duration), filter var(--interactive-duration);
}
</style>
