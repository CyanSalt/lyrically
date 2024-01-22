<script lang="ts" setup>
const { animated } = defineProps<{
  animated?: boolean,
}>()
</script>

<template>
  <div :class="['gradient-animation', { 'is-animated': animated }]"></div>
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
    background-image: var(--picture);
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
    animation-duration: 33s;
  }
  &::after {
    bottom: calc(100vh - 100vmax);
    left: calc(100vw - 100vmax);
    animation-duration: 27s;
  }
}
</style>
