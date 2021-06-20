<template>
  <div :class="['app', darkMode ? 'dark' : 'light', { vibrancy }]">
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
        <span class="feather-icon icon-move"></span>
      </div>
      <div class="control-item" @click="close">
        <span class="feather-icon icon-x"></span>
      </div>
      <div class="control-item" @click="toggleFullscreen">
        <span :class="['feather-icon', fullscreen ? 'icon-minimize' : 'icon-maximize']"></span>
      </div>
      <div class="control-item" @click="toggleDarkMode">
        <span :class="['feather-icon', darkMode ? 'icon-sun' : 'icon-moon']"></span>
      </div>
      <div class="control-item" @click="toggleVibrancy">
        <span :class="['feather-icon', vibrancy ? 'icon-cloud' : 'icon-cloud-off']"></span>
      </div>
      <div class="control-item" @click="play">
        <span :class="['feather-icon', isPlaying ? 'icon-pause' : 'icon-play']"></span>
      </div>
    </div>
    <div v-if="!isPlaying" class="searcher">
      <input v-model="keyword" class="searcher-input" @change="search">
      <div class="vendor-list">
        <img
          v-for="vendor in vendors"
          :key="vendor.icon"
          :class="['vendor-icon', { active: service === vendor }]"
          :src="vendor.icon"
          @click="activate(vendor)"
        >
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

<script lang="ts">
import { ipcRenderer } from 'electron'
import { computed, nextTick, shallowRef, ref, unref } from 'vue'
import { useFullscreen, useThemeSource, useVibrancy } from '../hooks/frame'
import { getHashCode, LCG } from '../utils/helper'
import type { LyricRow } from '../utils/lrc'
import { parseLRC } from '../utils/lrc'
import NeteaseService from '../vendors/netease'
import type { MusicInfo, MusicService } from '../vendors/types'

export default {
  name: 'app',
  setup() {
    const themeSourceRef = useThemeSource()
    const darkModeRef = computed(() => {
      return unref(themeSourceRef) === 'dark'
    })

    const fullscreenRef = useFullscreen()
    const vibrancyRef = useVibrancy()

    const isPlayingRef = ref(false)
    const currentIndexRef = ref(-1)
    const serviceRef = shallowRef<MusicService<any>>(NeteaseService)
    const infoRef = ref<MusicInfo>()
    const lrcRef = ref<LyricRow[]>([])
    const musicRef = ref('')
    const keywordRef = ref('')

    const audioRef = ref<HTMLAudioElement | null>(null)

    const indexesRef = computed(() => {
      const currentIndex = unref(currentIndexRef)
      return [currentIndex + 1, currentIndex, currentIndex - 1]
    })

    const lyricsRef = computed(() => {
      const lrc = unref(lrcRef)
      return lrc.map(row => row.text)
    })

    const classes = ['next', 'current', 'prev']

    function generateStyle(lyric, type) {
      const style: Partial<CSSStyleDeclaration> = {}
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

    const stylesRef = computed(() => {
      const lyrics = unref(lyricsRef)
      const indexes = unref(indexesRef)
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
      ipcRenderer.invoke('close')
    }

    function toggleFullscreen() {
      fullscreenRef.value = !fullscreenRef.value
    }

    function toggleDarkMode() {
      const darkMode = unref(darkModeRef)
      themeSourceRef.value = darkMode ? 'light' : 'dark'
    }

    function toggleVibrancy() {
      vibrancyRef.value = vibrancyRef.value ? undefined : 'selection'
    }

    function play() {
      const music = unref(musicRef)
      if (!music) return
      const audio = unref(audioRef)
      if (!audio) return
      if (audio.paused) {
        audio.play()
      } else {
        audio.pause()
      }
    }

    async function load(keyword) {
      const service = unref(serviceRef)
      const songs = await service.search(keyword)
      const song = songs[0]
      if (!song) return
      const { info, lyric, music } = await service.getData(song)
      infoRef.value = info
      lrcRef.value = parseLRC(lyric)
      musicRef.value = music
      currentIndexRef.value = -1
      await nextTick()
      const audio = unref(audioRef)
      if (audio) {
        audio.play()
      }
    }

    function search(event) {
      const keyword = event.target.value
      if (keyword) load(keyword)
    }

    function activate(vendor) {
      serviceRef.value = vendor
    }

    function handlePause() {
      isPlayingRef.value = false
    }

    function handlePlay() {
      isPlayingRef.value = true
      const info = unref(infoRef)
      if (info) keywordRef.value = info.name
    }

    function handleTimeUpdate(event) {
      const time = event.target.currentTime
      const animationTime = 1
      currentIndexRef.value = unref(lrcRef)
        .map(row => time >= (row.time - animationTime))
        .lastIndexOf(true)
    }

    function handleEnded() {
      isPlayingRef.value = false
    }

    return {
      darkMode: darkModeRef,
      fullscreen: fullscreenRef,
      vibrancy: vibrancyRef,
      isPlaying: isPlayingRef,
      indexes: indexesRef,
      classes,
      styles: stylesRef,
      lyrics: lyricsRef,
      keyword: keywordRef,
      music: musicRef,
      audio: audioRef,
      vendors,
      close,
      toggleFullscreen,
      toggleDarkMode,
      toggleVibrancy,
      play,
      search,
      activate,
      handlePause,
      handlePlay,
      handleTimeUpdate,
      handleEnded,
    }
  },
}
</script>

<style lang="scss" scoped>
:global(body) {
  margin: 0;
  font-size: 10vmin;
}
.app {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  --foreground: black;
  --background: white;
  transition: background 0.5s, color 0.5s;
  &.dark {
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
  to {
    transform: rotate3d(1, 1, 1, 2deg);
  }
}
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  animation: shake 3s ease-in-out infinite;
  perspective: 100vmin;
  transition: opacity 1s, filter 1s;
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
  transform: translate(-50%, -50%);
  color: var(--foreground);
  transition: color 0.5s;
  animation: fade-in 0.5s ease-in-out;
}
.searcher-input {
  appearance: none;
  border: none;
  outline: none;
  font: inherit;
  color: inherit;
  background: transparent;
  width: 50vw;
  text-align: center;
  border-bottom: 2px solid;
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
  cursor: pointer;
  filter: grayscale(1);
  opacity: 0.25;
  transition: opacity 0.4s;
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
  border-radius: 1em;
  color: var(--foreground);
  opacity: 0;
  transition: color 0.5s, opacity 0.4s;
  &:hover,
  &.resident {
    opacity: 1;
  }
}
.control-item {
  font-size: 0.375em;
  width: 2em;
  height: 2em;
  line-height: 2em;
  text-align: center;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
  &:hover {
    opacity: 1;
  }
  &.move {
    -webkit-app-region: drag;
  }
}
</style>
