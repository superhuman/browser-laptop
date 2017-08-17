/* global describe, it, beforeEach, afterEach */

const Brave = require('../lib/brave')
const profilerUtil = require('../lib/profilerUtil')
const {urlInput} = require('../lib/selectors')
const userProfiles = require('../lib/userProfiles')

describe('Performance startup', function () {
  Brave.beforeAllServerSetup(this)

  function * setup () {
    console.log('setup')
    Brave.addCommands()
  }

  function * setupBrave () {
    console.log('setupBrave')
    yield Brave.startApp()
    yield setup(Brave.app.client)
    yield Brave.app.client
      .waitForBrowserWindow()
  }

  function * restart (timeout = 1000) {
    console.log('restart')
    // XXX Wait for Brave to fully shutdown and free up inspect port 9222
    yield Brave.stopApp(false, timeout)
    yield setupBrave()
  }

  beforeEach(function * () {
    console.log('beforeEach')
    this.url = Brave.server.url('page1.html')
    yield setupBrave()
  })

  afterEach(function * () {
    console.log('afterEach')
    yield Brave.stopApp()
  })

  this.afterAll(function * () {
    console.log('afterAll')
    yield profilerUtil.uploadTravisArtifacts()
  })

  function * runStory () {
    console.log('runStory')
    yield Brave.app.client
      .waitForUrl(Brave.newTabUrl, 10000, 250)
      .waitForBrowserWindow()
      .windowByUrl(Brave.browserWindowUrl)
      .ipcSend('shortcut-focus-url')
      .waitForVisible(urlInput)
      .waitForElementFocus(urlInput)
    for (let i = 0; i < this.url.length; i++) {
      yield Brave.app.client
        .keys(this.url[i])
        .pause(30)
    }
    yield Brave.app.client
      .keys(Brave.keys.ENTER)
      .waitForUrl(this.url)
  }

  it('fresh', function * () {
    console.log('starting fresh')
    yield restart()
    yield profilerUtil.startProfiler(this)
    yield runStory.call(this)
    yield profilerUtil.stopProfiler(this, 'fresh')
  })

  it('2000 bookmarks', function * () {
    console.log('starting 2000 bookmarks')
    yield userProfiles.addBookmarks2000(Brave.app.client)
    yield restart()
    yield profilerUtil.startProfiler(this)
    yield runStory.call(this)
    yield profilerUtil.stopProfiler(this, '2000-bookmarks')
  })

  it('100 tabs', function * () {
    console.log('starting 100 tabs')
    yield userProfiles.addTabs100(Brave.app.client)
    yield restart(5000)
    yield profilerUtil.startProfiler(this)
    yield runStory.call(this)
    yield profilerUtil.stopProfiler(this, '100-tabs')
  })
})
