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

	var CachedFile = __webpack_require__(1)

	var errorCount = 0

	// http://stackoverflow.com/questions/2090551/parse-query-string-in-javascript
	function getQueryVariable(variable, query) {
	    var vars = query.split('&');
	    for (var i = 0; i < vars.length; i++) {
	        var pair = vars[i].split('=');
	        if (decodeURIComponent(pair[0]) === variable) {
	            return decodeURIComponent(pair[1]);
	        }
	    }
	}

	function validateOrigin(src) {
	  var url = new URL(src)
	  if (url.origin !== ("https://staging.superhuman.com") && url.origin !== ("chrome-extension://jjpbibigahifheoipgfgfdgakiljmlpl")) {
	    throw new Error('src url does not have expected origin:' + src)
	  }
	}

	function retry(src) {
	  errorCount++
	  if (errorCount < 100) {
	    // timeout goes 1, 10, 100, 1000, 1000, ...
	    timeout = Math.pow(10, errorCount - 1)
	    timeout = Math.min(timeout, 100000)

	    setTimeout(function() {
	      var cachedFile = new CachedFile(src)
	      cachedFile.delete().then(function() {
	        injectScriptForcefully(src);
	      })
	    }, timeout)
	  } else {
	    document.documentElement.classList.add('showError');
	  }
	}

	function injectScriptForcefully(src) {
	  var cachedFile = new CachedFile(src)
	  var script = document.createElement('script')
	  cachedFile.getBlobUrl().then(function(url) {
	    script.src = url
	    script.onerror = function () {
	      document.documentElement.removeChild(script)
	      retry(src)
	    }
	    document.documentElement.appendChild(script);

	  }).catch(function(error) {
	    if (script.parentNode == document.documentElement) {
	      document.documentElement.removeChild(script)
	    }

	    retry(src)
	  })
	}

	var src = getQueryVariable("src", window.location.hash.substring(1));
	validateOrigin(src)
	injectScriptForcefully(src);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	// CachedFile represents a source file that we cache.
	// Note:
	// - The cache we use is 'source'
	// - The cache is populated automatically when we call getBlobUrl here
	// - The cache is *also* pre-populated by the SourceCacheManager!
	// - CachedFile does not try to prune the cache, it lets SourceCacheManager deal
	//   with that. This does mean we can get older/not used files here, but
	//   SourceCacheManager will clean them up eventually.
	function CachedFile(url) {
	  this.url = url
	  this.request = new Request(url)
	}
	module.exports = CachedFile

	// Removes the file from the cache
	CachedFile.prototype.delete = function() {
	  var self = this;
	  return this._openCache().then(function() {
	    return self.cache.delete(self.request)
	  })
	}

	// Gets the blob url for the cached file. If the file does not exist this will
	// attempt to download it.
	CachedFile.prototype.getBlobUrl = function() {
	  var self = this
	  return this._openCache().then(function() {
	    if (false) {
	      return null
	    }
	    return self.cache.match(self.request)
	  }).then(function(response) {
	    if (response) {
	      self.response = response;
	      return self._toBlobUrl()
	    } else {
	      return self._downloadFile().then(function() {
	        return self._toBlobUrl()
	      })
	    }
	  })
	}

	CachedFile.prototype._openCache = function() {
	  if (this.cache) {
	    return Promise.resolve()
	  }

	  var self = this
	  return caches.open('source').then(function(_cache) {
	    self.cache = _cache
	  })
	}

	CachedFile.prototype._downloadFile = function() {
	  var self = this
	  return this._openCache().then(function() {
	    var options = {}
	    return self._fetch(self.url, options)
	  }).then(function(response) {
	    if (response.status !== 200) {
	      return Promise.reject(new Error('Failed to load the file status: ' + response.status))
	    }
	    // TODO(ibash) what else can go wrong? we should handle it here to avoid
	    // caching bad responses

	    self.response = response
	    return self.cache.put(self.url, response.clone())
	  })
	}

	// Assumes that this.response has been set
	CachedFile.prototype._toBlobUrl = function() {
	  return this.response.blob().then(function(blob) {
	    return window.URL.createObjectURL(blob)
	  })
	}

	// Note: This method is override in test
	CachedFile.prototype._fetch = function(url, options) {
	  // Note: credentials: 'include' is to allow staging app extension to send request with auth proxy cookies.
	  // http://stackoverflow.com/questions/30013131/how-do-i-use-window-fetch-with-httponly-cookies/30013241#30013241
	  if (true) {
	    options['credentials'] = 'include'
	  }
	  return fetch(url, options)
	}


/***/ }
/******/ ]);