const Immutable = require('immutable')

// TODO: Decouple test tab generation from topsites
const {topSites} = require('../../app/common/data/topSites')

// XXX: Up to ~2000 bookmarks
const addBookmarksN = function (total) {
  return function * (client) {
    const data = []
    let n = 0
    const pushBookmark = (etld, suffix = '') => {
      if (n >= total) {
        return false
      }
      data.push({
        location: `https://www.${etld}/${suffix}`,
        title: `${etld}, ${suffix}`,
        parentFolderId: 0
      })
      n += 1
    }
    for (let etld of topSites) {
      const success =
        pushBookmark(etld) &&
          pushBookmark(etld, 'tomato') &&
          pushBookmark(etld, 'potato') &&
          pushBookmark(etld, 'onion')
      if (!success) { break }
    }
    const immutableData = Immutable.fromJS(data)
    yield client.addBookmarks(immutableData)
  }
}
const addBookmarks2000 = addBookmarksN(2000)

const addTabsN = function (total) {
  return function * (client) {
    const data = []
    for (let i = 0; i < total; i++) {
      const etld = topSites[i]
      data.push({
        active: false,
        discarded: true,
        url: `https://www.${etld}`
      })
    }
    for (let datum of data) {
      yield client.newTab(datum, false, true) // isRestore
    }
  }
}
const addTabs100 = addTabsN(100)

module.exports = {
  addBookmarks2000,
  addTabs100
}
