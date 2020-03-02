/* eslint-disable no-console */
const packager = require('electron-packager')
const childProcess = require('child_process')
const app = require('./package.json')

const options = {
  dir: '.',
  name: process.platform === 'win32' ?
    app.name : app.productName,
  out: 'dist/',
  overwrite: true,
  asar: true,
  ignore: [
    '^/(?!assets|main|renderer|node_modules|package\\.json)',
    '^/renderer/(?!build|index\\.html)',
  ],
  appVersion: app.version,
  appCopyright: [
    'Copyright \u00a9', new Date().getFullYear(), app.author,
  ].join(' '),
  win32metadata: {
    FileDescription: app.productName,
    OriginalFilename: `${app.name}.exe`,
  },
}

// equivalent to {type: 'development'} for electron-osx-sign
if (process.platform === 'darwin') {
  options.osxSign = {
    identity: childProcess.execSync(
      'security find-identity -p codesigning -v | grep -o "\\"Apple Development: .*\\""'
    ).toString().trim(),
  }
}

packager(options).then(() => {
  console.log('Build finished.')
}).catch(e => {
  console.error(e)
})
