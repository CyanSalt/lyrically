import vue from '@vitejs/plugin-vue'
import * as vite from 'vite'

/**
 * @typedef {import('vite').InlineConfig} InlineConfig
 */

/**
 * @param {NodeJS.ProcessVersions} versions
 */
export default (versions) => vite.build({
  root: 'src/renderer',
  configFile: false,
  envFile: false,
  base: './',
  define: {
    // Optimization
    'process.type': JSON.stringify('renderer'),
  },
  plugins: [
    vue(),
  ],
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    target: `chrome${versions.chrome.split('.')[0]}`,
    assetsDir: '.',
    minify: false,
  },
})
