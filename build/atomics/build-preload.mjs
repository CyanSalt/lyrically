import esbuild from 'esbuild'
import pkg from '../../package.json' with { type: 'json' }

/**
 * @param {NodeJS.ProcessVersions} versions
 */
export default (versions) => esbuild.build({
  entryPoints: ['src/preload/index.ts'],
  outfile: 'dist/preload/index.js',
  bundle: true,
  platform: 'node',
  target: `node${versions.node}`,
  external: [
    'electron',
    ...Object.keys(pkg.dependencies),
  ],
  define: {
    // Optimization
    'process.type': JSON.stringify('renderer'),
  },
})
