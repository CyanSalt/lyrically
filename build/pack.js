const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const util = require('util')
const chalk = require('chalk')
const packager = require('electron-packager')
const app = require('../package.json')

const execa = util.promisify(childProcess.exec)

const logger = {
  info(message) {
    console.log(chalk.inverse(chalk.blue(' INFO ')) + ' ' + message)
  },
  done(message) {
    console.log(chalk.inverse(chalk.green(' DONE ')) + ' ' + message)
  },
  warn(message) {
    console.log(chalk.inverse(chalk.yellow(' WARN ')) + ' ' + chalk.yellow(message))
  },
  error(message) {
    console.error(chalk.inverse(chalk.red(' ERROR ')) + ' ' + chalk.red(message))
  },
}

const options = {
  dir: '.',
  platform: ['darwin', 'linux', 'win32'],
  executableName: process.platform === 'win32'
    ? app.name : app.productName,
  out: 'dist/',
  overwrite: true,
  asar: true,
  ignore: [
    '^/(?!addons|bin|main|node_modules|renderer|resources|package\\.json)',
    '^/main/(?!dist)$',
    '^/renderer/(?!dist|index\\.html)$',
    '^/resources/.*\\.(ico|icns)$',
  ],
  extraResource: [
    'bin',
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

async function getMacOSCodeSign(name) {
  const { stdout } = await execa(
    `security find-identity -p codesigning -v | grep -o "\\"${name}: .*\\""`
  )
  return stdout.toString().trim()
}

async function compressPackage(dir) {
  logger.info(`Packing ${path.basename(dir)}...`)
  try {
    await fs.promises.unlink(`${dir}.zip`)
  } catch {
    // ignore error
  }
  return execa(`zip -ry ${dir}.zip ${dir}/`)
}

async function pack() {
  // Generate icons
  const startedAt = Date.now()
  // Equivalent to { type: 'development' } for electron-osx-sign
  if (process.platform === 'darwin') {
    options.osxSign = {
      identity: await getMacOSCodeSign('Apple Development'),
      'gatekeeper-assess': false,
    }
  }
  // Run electron-packager
  const appPaths = await packager(options)
  await Promise.all(
    appPaths.map(dir => compressPackage(dir))
  )
  return Date.now() - startedAt
}

pack().then(
  duration => {
    logger.done(`Build finished after ${duration / 1000}s.`)
  },
  err => {
    logger.error(err)
  },
)
