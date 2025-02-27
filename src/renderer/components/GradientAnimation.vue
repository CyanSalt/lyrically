<script lang="ts" setup>
import { useImage } from '@vueuse/core'
import { watchEffect } from 'vue'

const { picture, animated } = defineProps<{
  picture?: string,
  animated?: boolean,
}>()

const {
  isReady,
  state: image,
} = $(useImage(() => ({
  src: picture ?? '',
})))

const canvas = new OffscreenCanvas(32, 32)
const context = canvas.getContext('2d')!

let pixelatedURL = $ref<string>()
watchEffect(async onInvalidate => {
  if (isReady && image) {
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await canvas.convertToBlob()
    const url = URL.createObjectURL(blob)
    pixelatedURL = url
    onInvalidate(() => {
      pixelatedURL = undefined
      URL.revokeObjectURL(url)
    })
  }
})

const pictureImage = $computed(() => {
  if (!pixelatedURL) return undefined
  return `url("${pixelatedURL}")`
})
</script>

<template>
  <div
    :class="['gradient-animation', { 'is-animated': animated }]"
    :style="{ '--picture-image': pictureImage }"
    aria-hidden="true"
  ></div>
</template>

<style lang="scss" scoped>
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.gradient-animation {
  position: fixed;
  width: 100vw;
  height: 100vh;
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 200vmax;
    height: 200vmax;
    background-image: var(--picture-image);
    background-size: 100%;
    background-repeat: no-repeat;
    border-radius: 100vmax;
    filter: blur(2em);
    animation: rotate 30s linear infinite paused;
  }
  &.is-animated::before,
  &.is-animated::after {
    animation-play-state: running;
  }
  &::before {
    top: calc(100vh - 100vmax);
    right: calc(100vw - 100vmax);
    z-index: 10;
    mix-blend-mode: luminosity;
    animation-duration: #{30s + 3s};
  }
  &::after {
    bottom: calc(100vh - 100vmax);
    left: calc(100vw - 100vmax);
    animation-duration: #{30s - 3s};
  }
}
</style>
