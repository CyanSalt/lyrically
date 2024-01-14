import buildMain from './atomics/build-main.mjs'
import buildPreload from './atomics/build-preload.mjs'
import buildRenderer from './atomics/build-renderer.mjs'
import getVersions from './utils/get-versions.mjs'

getVersions().then(versions => Promise.all([
  buildMain(versions),
  buildPreload(versions),
  buildRenderer(versions),
]))
