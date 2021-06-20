const { builtinModules } = require('module')
const vue = require('@vitejs/plugin-vue')
const { build } = require('vite')

const wrapIIFE = () => ({
  name: 'wrap-iife',
  generateBundle(options, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.code) {
        chunk.code = `(function(){\n${chunk.code}\n})()`
      }
    }
  },
})

module.exports = () => build({
  configFile: false,
  envFile: false,
  root: 'renderer',
  base: './',
  define: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __VUE_OPTIONS_API__: JSON.stringify(false),
  },
  plugins: [
    vue(),
    wrapIIFE(),
  ],
  json: {
    stringify: true,
  },
  build: {
    assetsDir: '.',
    minify: false,
    rollupOptions: {
      external: [
        ...builtinModules,
        'electron',
      ],
      output: {
        freeze: false,
      },
    },
    lib: {
      entry: 'app.ts',
      formats: ['cjs'],
      fileName: 'app',
    },
  },
})
