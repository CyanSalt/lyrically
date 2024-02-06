<script lang="ts" setup>
import { debounce } from 'lodash-es'

let modelValue = $(defineModel<number>({ default: 0 }))

const GRID_SIZE = 96 // 1in

let isActive = $ref(false)

const deactivate = debounce(() => {
  isActive = false
}, 500)

function start(startingEvent: PointerEvent) {
  let initialValue = modelValue
  isActive = true
  const target = startingEvent.target as HTMLElement
  target.setPointerCapture(startingEvent.pointerId)
  function handleMove(movingEvent: PointerEvent) {
    modelValue = initialValue + (startingEvent.clientX - movingEvent.clientX) / GRID_SIZE
  }
  function handleStop(stoppingEvent: PointerEvent) {
    deactivate()
    modelValue = initialValue + (startingEvent.clientX - stoppingEvent.clientX) / GRID_SIZE
    target.releasePointerCapture(startingEvent.pointerId)
    window.removeEventListener('pointermove', handleMove)
    window.removeEventListener('pointerup', handleStop)
    window.removeEventListener('pointercancel', handleStop)
  }
  window.addEventListener('pointermove', handleMove, { passive: true })
  window.addEventListener('pointerup', handleStop)
  window.addEventListener('pointercancel', handleStop)
}

function reset() {
  modelValue = 0
}
</script>

<template>
  <div
    :class="['slider', { 'is-active': isActive }]"
    :style="{ '--position-offset': `calc(${modelValue * -1} * var(--grid-size))` }"
  >
    <div class="control" @pointerdown="start" @dblclick="reset"></div>
    <div class="track"></div>
  </div>
</template>

<style lang="scss" scoped>
:global(body:has(.slider.is-active)) {
  user-select: none;
}
.slider {
  --slider-size: 50vw;
  --base-offset: calc(var(--slider-size) / 2);
  --position-offset: 0px;
  --grid-size: 1in;
  --guide-line-size: 8px;
  --line-width: 2px;
  position: relative;
  display: flex;
  align-items: center;
  width: var(--slider-size);
  height: 1em;
}
.control {
  position: absolute;
  top: 0;
  left: 50%;
  width: 1em;
  height: 1em;
  transform: translateX(-50%);
  cursor: col-resize;
  &::before {
    content: '';
    position: absolute;
    bottom: 50%;
    left: 50%;
    margin-left: calc(var(--line-width) / 2);
    border-width: calc(var(--guide-line-size) * 2) var(--guide-line-size) 0;
    border-style: solid;
    border-color: currentColor transparent transparent;
    transform: translateX(-50%);
  }
}
.track {
  position: relative;
  width: 100%;
  height: calc(var(--guide-line-size) * 2);
  background-image: linear-gradient(to right, currentColor, currentColor var(--line-width), transparent var(--line-width));
  background-position-x: calc(var(--base-offset) + var(--position-offset));
  background-position-y: calc(50% + var(--line-width) * 1.5);
  background-size: var(--grid-size) var(--guide-line-size);
  background-repeat: repeat-x;
  opacity: 0;
  transform: scaleY(-1);
  transition: opacity var(--fade-duration);
  .slider.is-active & {
    opacity: 1;
  }
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: linear-gradient(to right, currentColor, currentColor var(--line-width), transparent var(--line-width));
    background-position-x: calc(var(--base-offset) + var(--position-offset));
    background-size: var(--grid-size) 100%;
    background-repeat: no-repeat;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: linear-gradient(to bottom, currentColor, currentColor var(--line-width), transparent var(--line-width));
    background-position-y: calc(50% + var(--line-width) * 1.5);
    background-size: 100% var(--guide-line-size);
    background-repeat: no-repeat;
  }
}
</style>
