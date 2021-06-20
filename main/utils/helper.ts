import * as childProcess from 'child_process'
import * as util from 'util'

const execa = util.promisify(childProcess.exec)

export {
  execa,
}
