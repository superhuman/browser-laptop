/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	// This is the background page host, it creates an iframe for every connection
	// request.

	// TODO(ibash) handle updates being available more robustly
	//
	// What's is this all about?
	//
	// When an update to the extension is available, chrome dispatches a message to
	// onUpdateAvailable with the updated manifest. It's up to the user whether they
	// want to reload (update) the extension or not.
	//
	// However, reloading the extension makes it so any existing foreground apps
	// cannot connect (e.g. calling chrome.runtime.connect returns undefined).
	//
	// Currently if a page is visible we prompt the user to refresh when it can't
	// connect to the background.
	//
	// In the long run it would be ideal if:
	//   - When an extension update is available the background should check the
	//   manifest or check our server whether it is an urgent update.
	//     - if it is urgent the background should reload the extension and have the foregrounds pop up a dialog
	//     - if it is not urgent the background should wait until all the foregrounds are closed to reload the extension
	// Note: I do not know how to test an onUpdateAvailable, but you can test the
	// extension reloading by:
	// - clicking "reload" in chrome://extensions
	// - toggling "Allow in incognito" or "Allow access to file URLs" in
	//   chrome://extension
	// - calling chrome.runtime.reload() in the background page
	//
	// ref: https://developer.chrome.com/extensions/runtime#event-onUpdateAvailable
	// ref: https://github.com/superhuman/superhuman/issues/703

	chrome.runtime.onUpdateAvailable.addListener(function(details) {
	  chrome.runtime.reload()
	})

	// BackgroundPage creates an iframe with the background page of the version of
	// the superhuman app requested.
	window.BackgroundPage = function (url, options) {
	  this.url = url
	  this.iframe = null
	  this.iframeLoaded = false
	  this.options = options
	  this.create()
	}

	BackgroundPage.prototype.create = function create() {
	  var self = this
	  this.iframe = document.createElement('iframe')

	  // Note: superhuman.html simply loads the file requested.
	  this.iframe.src = chrome.extension.getURL('superhuman.html') + '#src=' + this.url

	  this.iframe.addEventListener('load', function () {
	    self.iframeLoaded = true
	    self.iframe.contentWindow.initOptions = self.options
	  })
	  var body = document.querySelector("body")
	  body.appendChild(this.iframe)
	}

	// TODO(ibash) remove doesn't close the ports associated with this background
	// page - it just removes the background page iframe. If there are any ports
	// associated with this background page, they'll remain connected.
	BackgroundPage.prototype.remove = function remove() {
	  if (!this.iframe) {
	    return;
	  }
	  var body = document.querySelector("body")
	  body.removeChild(this.iframe)
	  this.iframe = null
	}

	window.saveBackgroundInfo = function(url, version) {
	  localStorage['backgroundInfo'] = JSON.stringify({url: url, version: version})
	}

	window.loadBackgroundInfo = function() {
	  var info = localStorage['backgroundInfo']
	  if (!info) {
	    return
	  }
	  return JSON.parse(info)
	}


	window.backgrounds = {}

	window.loadSingletonPage = function() {
	  if (window.backgrounds.singleton) {
	    window.backgrounds.singleton.remove()
	  }
	  delete window.backgrounds["singleton"]

	  var backgroundInfo = loadBackgroundInfo()
	  if (!backgroundInfo) {
	    return
	  }

	  window.backgrounds.singleton = new BackgroundPage(backgroundInfo.url, {singleton:true})
	  window.backgrounds.singleton.iframe.id = 'singleton'
	}

	chrome.gcm.onMessage.addListener(function(message) {
	  runOnSingletonPage(function (singletonWindow) {
	    singletonWindow.showNotifications(message);
	  })
	});

	chrome.browserAction.onClicked.addListener(function(tab) {
	  chrome.tabs.create({
	    windowId: tab.windowId,
	    index: tab.index + 1,
	    url: ("https://staging.superhuman.com"),
	    active: true
	  })
	});

	window.runOnSingletonPage = function (callback, canReloadSingletonPage) {
	  var singletonPage = window.backgrounds.singleton
	  var contentWindow = singletonPage && singletonPage.iframe && singletonPage.iframe.contentWindow

	  if (singletonPage && singletonPage.iframeLoaded &&
	      contentWindow && contentWindow.showNotifications) {
	    callback(singletonPage.iframe.contentWindow);

	  } else if (singletonPage && !singletonPage.iframeLoaded) {
	    singletonPage.iframe.addEventListener('load', function () {
	      runOnSingletonPage(callback, false)
	    })

	  } else if (canReloadSingletonPage) {
	    // The singleton page could have errored while loading, try to reload it
	    // and listen to a load event.
	    //TODO(CI): bugsnag.notify when this occurs, or there is no singletonPage
	    loadSingletonPage()
	    runOnSingletonPage(callback, false)
	  }
	}

	window.findOrCreateBackground = function (message) {
	  // backgroundInfo is used by the background page to load the correct version
	  // for notifications.
	  var backgroundInfo = loadBackgroundInfo()
	  if (!backgroundInfo || new Date(backgroundInfo.version) < new Date(message.version)) {
	    saveBackgroundInfo(message.url, message.version)
	    loadSingletonPage()
	  }

	  var background = window.backgrounds[message.emailAddress]
	  if (!background) {
	    background = new BackgroundPage(message.url, {emailAddress:message.emailAddress})
	    window.backgrounds[message.emailAddress] = background
	    background.iframe.id = message.emailAddress
	  }

	  return background;
	}

	window.onRuntimeMessage = function (message, port) {
	  if (message.channel !== 'REQUEST_BACKGROUND') {
	    return
	  }

	  var background = findOrCreateBackground({
	    url: message.url,
	    version: message.version,
	    emailAddress: message.emailAddress
	  })

	  if (background && background.iframe &&
	      background.iframe.contentWindow &&
	      background.iframe.contentWindow.requestBackground) {
	    background.iframe.contentWindow.requestBackground(message, port)
	  }
	}

	// onWindowMessage handles postMessage calls from the extension
	// iframes.  This is needed both because you cannot use
	// chrome.runtime.connect() in the background page, and also to
	// maintain a clear separation between messages from the foreground
	// and messages from the background.
	window.onWindowMessage = function (request) {
	  var channel = request && request.channel,
	      message = request && request.message || {};

	  if (channel === 'CREATE_BACKGROUND') {
	    findOrCreateBackground({
	      url: message.url,
	      version: message.version,
	      emailAddress: message.emailAddress
	    });
	  } else if (channel === 'REMOVE_BACKGROUND') {
	    var background = window.backgrounds[message.emailAddress]
	    if (background) {
	      delete window.backgrounds[message.emailAddress]
	      background.remove()
	    }
	  }
	}

	window.addEventListener('message', function (event) {
	  if (event.origin !== ("https://staging.superhuman.com") &&
	      event.origin !== ("chrome-extension://jjpbibigahifheoipgfgfdgakiljmlpl")) {
	    throw new Error('Connection received from non-superhuman sender', event.origin)
	  }

	  onWindowMessage(event.data)
	})

	chrome.runtime.onConnect.addListener(function onConnect(port) {
	  if (port.sender.id !== chrome.runtime.id) {
	    throw new Error('Connection received from non-superhuman sender', port.sender)
	  }

	  port.onMessage.addListener(onRuntimeMessage)
	})

	chrome.runtime.onConnectExternal.addListener(function onConnect(port) {
	  var url = new URL(port.sender.url)
	  if (url.origin !== ("https://staging.superhuman.com")) {
	    throw new Error('Connection received from non-superhuman sender', port.sender)
	  }

	  port.onMessage.addListener(onRuntimeMessage)
	})

	loadSingletonPage()


/***/ }
/******/ ]);