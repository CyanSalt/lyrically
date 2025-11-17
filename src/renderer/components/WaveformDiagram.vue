<template>
  <div class="waveform-diagram">
    <div v-for="i in 4" :key="i" class="diagram-bar"></div>
  </div>
</template>

<style lang="scss" scoped>
.waveform-diagram {
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  width: 1em;
  height: 1em;
  padding: 0.1em;
}
.diagram-bar {
  width: 0.125em;
  height: 0.15em;
  background-color: color-mix(in oklch, currentColor 25%, var(--picture-color, currentColor));
  border-radius: 1em;
  .waveform-diagram.is-playing & {
    animation: diagram-bar-playing 1s linear infinite;
  }
}
@keyframes diagram-bar-playing {
  0% {
    height: 0.15em;
  }
  50% {
    height: 0.75em;
  }
  100% {
    height: 0.15em;
  }
}
.diagram-bar:nth-child(2) {
  animation-delay: 0.5s !important;
}
.diagram-bar:nth-child(3) {
  animation-delay: 0.25s !important;
}
.diagram-bar:nth-child(4) {
  animation-delay: 0.75s !important;
}
</style>
