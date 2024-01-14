/**
 * @returns {import('esbuild').Plugin}
 */
export default ({ filter = /^[^./]|^\.[^./]|^\.\.[^/]/ } = {}) => ({
  name: 'esbuild-external-node-modules',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter }, args => ({ path: args.path, external: true }))
  },
})
