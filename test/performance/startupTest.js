/* global describe, it, beforeEach, afterEach */

const Brave = require('../lib/brave')
const profilerUtil = require('../lib/profilerUtil')
const {urlInput} = require('../lib/selectors')
const userProfiles = require('../lib/userProfiles')

describe('Performance startup', function () {
  Brave.beforeAllServerSetup(this)

  function * setup () {
    yield Brave.startApp()
    Brave.addCommands()
    yield Brave.app.client
      .waitForUrl(Brave.newTabUrl)
      .waitForBrowserWindow()
  }

  function * restart (timeout = 1000) {
    // XXX Wait for Brave to fully shutdown and free up inspect port 9222
    yield Brave.stopApp(false, timeout)
    yield Brave.startApp()
    Brave.addCommands()
  }

  beforeEach(function * () {
    this.url = Brave.server.url('page1.html')
    yield setup()
  })

  afterEach(function * () {
    yield Brave.stopApp()
  })

  function * runStory () {
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
    yield restart()
    yield profilerUtil.startProfiler(this)
    yield runStory.call(this)
    yield profilerUtil.stopProfiler(this, 'fresh')
  })

  it('2000 bookmarks', function * () {
    yield userProfiles.addBookmarks2000(Brave.app.client)
    yield restart()
    yield profilerUtil.startProfiler(this)
    yield runStory.call(this)
    yield profilerUtil.stopProfiler(this, '2000-bookmarks')
  })

  it('100 tabs', function * () {
    yield userProfiles.addTabs100(Brave.app.client)
    yield restart(5000)
    yield profilerUtil.startProfiler(this)
    yield runStory.call(this)
    yield profilerUtil.stopProfiler(this, '100-tabs')
  })
})
