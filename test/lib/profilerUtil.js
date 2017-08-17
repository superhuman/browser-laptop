/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

const CDP = require('chrome-remote-interface')
const fs = require('fs')

const LOG_FOLDER = './cpu-profiles'

/**
 * Connect to a remote instance using Chrome Debugging Protocol and enable
 * the Profiler. Afterwards you need to profiler.start
 * See https://github.com/cyrus-and/chrome-remote-interface#cdpoptions-callback
 */
const initProfiler = function * (context) {
  const cdp = yield CDP({port: 9222})
  context.profiler = cdp.Profiler
  yield context.profiler.enable()
  yield context.profiler.setSamplingInterval({interval: 100})
}

/**
 * initProfiler and start it.
 * @param context {object} webdriver client
 */
const startProfiler = function * (context) {
  yield initProfiler(context)
  yield context.profiler.start()
}

/**
 * @param context {object} webdriver client
 * @param tag {string=} Optional file prefix
 * @returns filename to which CPU profile was written
 */
const stopProfiler = function * (context, tag = '') {
  const cdpProfilerResult = yield context.profiler.stop()
  if (!fs.existsSync(LOG_FOLDER)) {
    console.log(`Creating directory ${LOG_FOLDER}`)
    fs.mkdirSync(LOG_FOLDER)
  }
  const filename = `${LOG_FOLDER}/${process.env.NODE_ENV}-${tag}-${new Date().toISOString()}.cpuprofile`
  const string = JSON.stringify(cdpProfilerResult.profile, null, 2)
  fs.writeFile(filename, string)
  console.log(`Wrote CPU profile data to: ${filename}`)
  return filename
}

module.exports = {
  initProfiler,
  startProfiler,
  stopProfiler
}
