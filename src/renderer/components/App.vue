<script lang="ts" setup>
import { LucideCloud, LucideCloudOff, LucideMaximize, LucideMinimize, LucideMoon, LucideMove, LucidePause, LucidePlay, LucideSun, LucideX } from 'lucide-vue-next'
import type { CSSProperties } from 'vue'
import { nextTick } from 'vue'
import { useDarkMode, useFullscreen, useVibrancy } from '../compositions/frame'
import { getHashCode, LCG } from '../utils/helper'
import type { LyricRow } from '../utils/lrc'
import { parseLRC } from '../utils/lrc'
import NeteaseService from '../vendors/netease'
import type { MusicInfo, MusicService } from '../vendors/types'

let darkMode = $(useDarkMode())
let fullscreen = $(useFullscreen())
let vibrancy = $(useVibrancy())

let isPlaying = $ref(false)
let currentIndex = $ref(-1)
let service = $shallowRef<MusicService<any>>(NeteaseService)
let currentInfo = $ref<MusicInfo>()
let lrc = $ref<LyricRow[]>([])
let audioURL = $ref('')
let keyword = $ref('')

const audio = $ref<HTMLAudioElement>()

const indexes = $computed(() => {
  return [currentIndex + 1, currentIndex, currentIndex - 1]
})

const lyrics = $computed(() => {
  return lrc.map(row => row.text)
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
    const x = (n => (n > 0 ? 50 : -50) + n * 50)(rand() * 2 - 1)
    const y = (n => (n > 0 ? 50 : -50) + n * 50)(rand() * 2 - 1)
    const r1 = rand() * 2 - 1
    const r2 = rand() * 2 - 1
    const r3 = rand() * 2 - 1
    const a = (rand() * 2 - 1) * 180
    const s = rand() * 0.5
    style.transform = `translate(${x}vw, ${y}vh) rotate3d(${r1}, ${r2}, ${r3}, ${a}deg) scale(${s})`
  } else if (type === 'edge') {
    const x = (n => (n > 0 ? 25 : -25) + n * 25)(rand() * 2 - 1)
    const y = (n => (n > 0 ? 25 : -25) + n * 25)(rand() * 2 - 1)
    const r1 = rand() * 2 - 1
    const r2 = rand() * 2 - 1
    const r3 = rand() * 2 - 1
    const a = (rand() * 2 - 1) * 90
    const s = rand() * 0.5 + 0.25
    style.transform = `translate(${x}vw, ${y}vh) rotate3d(${r1}, ${r2}, ${r3}, ${a}deg) scale(${s})`
  } else {
    const x = (rand() * 2 - 1) * 25
    const y = (rand() * 2 - 1) * 25
    const r1 = rand() * 2 - 1
    const r2 = rand() * 2 - 1
    const r3 = rand() * 2 - 1
    const a = (rand() * 2 - 1) * 45
    const x1 = `calc(${x}vw ${x > 0 ? '-' : '+'} ${Math.abs(x)}%)`
    const y1 = `calc(${y}vh ${y > 0 ? '-' : '+'} ${Math.abs(y)}%)`
    style.transform = `translate(${x1}, ${y1}) rotate3d(${r1}, ${r2}, ${r3}, ${a}deg)`
  }
  return style
}

const styles = $computed(() => {
  return [
    generateStyle(lyrics[indexes[0]], 'edge'),
    generateStyle(lyrics[indexes[1]], 'inside'),
    generateStyle(lyrics[indexes[2]], 'outside'),
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
  if (!audioURL) return
  if (!audio) return
  if (audio.paused) {
    audio.play()
  } else {
    audio.pause()
  }
}

async function load(query: string) {
  const songs = await service.search(query)
  const song = songs[0]
  if (!song) return
  const { info, lyric, music } = await service.getData(song)
  currentInfo = info
  lrc = parseLRC(lyric)
  audioURL = music
  currentIndex = -1
  await nextTick()
  if (audio) {
    audio.play()
  }
}

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
  if (currentInfo) {
    keyword = currentInfo.name
  }
}

function handleTimeUpdate(event) {
  const time = event.target.currentTime
  const animationTime = 1
  currentIndex = lrc
    .map(row => time >= (row.time - animationTime))
    .lastIndexOf(true)
}

function handleEnded() {
  isPlaying = false
}
</script>

<template>
  <div :class="['app', { vibrancy }]">
    <div :class="['full', 'container', { distant: !isPlaying }]">
      <div
        v-for="(index, order) in indexes"
        :key="index"
        :style="styles[order]"
        :class="[classes[order], 'lyric']"
      >{{ lyrics[index] }}</div>
    </div>
    <div :class="['control-bar', { resident: !isPlaying }]">
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
        <LucidePause v-if="isPlaying" />
        <LucidePlay v-else />
      </div>
    </div>
    <div v-if="!isPlaying" class="searcher">
      <input v-model="keyword" class="searcher-input" @change="search">
      <div class="vendor-list">
        <img
          v-for="vendor in vendors"
          :key="vendor.name"
          :class="['vendor-icon', { active: service === vendor }]"
          :src="vendor.icon"
          @click="activate(vendor)"
        >
      </div>
    </div>
    <audio
      ref="audio"
      :src="audioURL"
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
  &:not(.vibrancy) {
    background: var(--background);
  }
}
.full {
  width: 100vw;
  height: 100vh;
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
  perspective: 100vmin;
  transition: opacity 1s, filter 1s;
  animation: shake 3s ease-in-out infinite;
  &.distant {
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
  outline: none;
}
.vendor-list {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 1em;
}
.vendor-icon {
  width: 0.5em;
  height: 0.5em;
  opacity: 0.25;
  filter: grayscale(1);
  transition: opacity 0.4s;
  cursor: pointer;
  &.active {
    opacity: 1;
  }
  & + & {
    margin-left: 0.5em;
  }
}
.audio {
  display: none;
}
.control-bar {
  position: fixed;
  top: 0.5em;
  left: 0.5em;
  display: flex;
  color: var(--foreground);
  border-radius: 1em;
  opacity: 0;
  transition: color 0.5s, opacity 0.4s;
  &:hover,
  &.resident {
    opacity: 1;
  }
}
.control-item {
  width: 2em;
  height: 2em;
  font-size: 0.375em;
  line-height: 2em;
  text-align: center;
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
