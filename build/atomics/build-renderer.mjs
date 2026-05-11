import vue from '@vitejs/plugin-vue'
import * as vite from 'vite'

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
    __VUE_OPTIONS_API__: JSON.stringify(false),
  },
  plugins: [
    vue(),
  ],
  json: {
    stringify: true,
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    target: `chrome${versions.chrome.split('.')[0]}`,
    assetsDir: '.',
    minify: false,
  },
})
