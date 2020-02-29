<template>
  <div id="root">
    <div class="full container">
      <input v-if="!playing" v-model="keyword" type="text" class="searcher" @change="search">
      <div
        v-for="(index, order) in indexes"
        :key="index"
        :style="styles[order]"
        :class="[classes[order], 'lyric']"
      >{{ lyrics[index] }}</div>
    </div>
    <div class="control-bar">
      <div class="control-item move">
        <span class="feather-icon icon-move"></span>
      </div>
      <div class="control-item" @click="close">
        <span class="feather-icon icon-x"></span>
      </div>
      <div class="control-item" @click="toggleFullscreen">
        <span :class="['feather-icon', fullscreen ? 'icon-minimize' : 'icon-maximize']"></span>
      </div>
      <div class="control-item" @click="play">
        <span :class="['feather-icon', playing ? 'icon-pause' : 'icon-play']"></span>
      </div>
    </div>
    <audio
      ref="audio" :src="music" class="audio"
      @pause="handlePause" @play="handlePlay"
      @timeupdate="handleTimeUpdate" @ended="handleEnded"
    ></audio>
  </div>
</template>

<script>
import {ipcRenderer} from 'electron'
import {getHashCode, LCG} from '../utils/helper'
import {searchSong, getLyrics, getMusicURL} from '../utils/netease'
import {parseLRC} from '../utils/lrc'

export default {
  name: 'App',
  data() {
    return {
      keyword: '',
      song: null,
      lrc: [],
      music: '',
      currentIndex: -1,
      playing: false,
      fullscreen: false,
    }
  },
  computed: {
    lyrics() {
      return this.lrc.map(row => row.text)
    },
    classes() {
      return ['next', 'current', 'prev']
    },
    indexes() {
      return [this.currentIndex + 1, this.currentIndex, this.currentIndex - 1]
    },
    styles() {
      return [
        this.generateStyle(this.lyrics[this.indexes[0]], 'edge'),
        this.generateStyle(this.lyrics[this.indexes[1]], 'inside'),
        this.generateStyle(this.lyrics[this.indexes[2]], 'outside'),
      ]
    },
  },
  mounted() {
    ipcRenderer.on('enter-full-screen', () => {
      this.fullscreen = true
    })
    ipcRenderer.on('leave-full-screen', () => {
      this.fullscreen = false
    })
  },
  methods: {
    async load(name) {
      const songs = await searchSong(name)
      const song = songs[0]
      if (!song) return
      this.song = song
      const lyrics = await getLyrics(song.id)
      this.currentIndex = -1
      this.lrc = parseLRC(lyrics.lrc.lyric)
      this.music = getMusicURL(song.id)
      await this.$nextTick()
      this.$refs.audio.play()
      this.keyword = song.name
    },
    search(event) {
      const keyword = event.target.value
      if (keyword) this.load(keyword)
    },
    handlePause() {
      this.playing = false
    },
    handlePlay() {
      this.playing = true
    },
    handleTimeUpdate(event) {
      const time = event.target.currentTime
      const animationTime = 1
      this.currentIndex = this.lrc
        .map(row => time >= (row.time - animationTime))
        .lastIndexOf(true)
    },
    handleEnded() {
      this.playing = false
    },
    toggleFullscreen() {
      ipcRenderer.invoke('toggleFullscreen')
    },
    close() {
      ipcRenderer.invoke('close')
    },
    play() {
      if (!this.music) return
      const audio = this.$refs.audio
      if (audio.paused) {
        audio.play()
      } else {
        audio.pause()
      }
    },
    generateStyle(lyric, type) {
      const style = {}
      if (!lyric) {
        return style
      }
      const rv = LCG(getHashCode(lyric))()
      if (rv < 0.2) {
        style.background = 'black'
        style.color = 'white'
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
    },
  },
}
</script>

<style>
body {
  margin: 0;
  font-size: 10vmin;
}
#root {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
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
}
.lyric {
  position: absolute;
  transition: transform 1s ease-in-out, opacity 1s ease-in-out, filter 1s ease-in-out;
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
  -webkit-appearance: none;
  border: none;
  outline: none;
  font: inherit;
  width: 50vw;
  text-align: center;
  background: black;
  color: white;
  animation: fade-in 0.5s ease-in-out;
  z-index: 1;
}
.audio {
  display: none;
}
.control-bar {
  position: fixed;
  top: 0.5em;
  left: 0.5em;
  padding: 0 0.2em;
  display: flex;
  border-radius: 1em;
  background: black;
  color: white;
  transition: opacity 0.4s;
  opacity: 0;
}
.control-bar:hover {
  opacity: 1;
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
}
.control-item:hover {
  opacity: 1;
}
.control-item.move {
  -webkit-app-region: drag;
}
</style>
