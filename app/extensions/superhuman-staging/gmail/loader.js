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

	function loadScript(url, callback) {
	  var script = document.createElement("script")
	  script.type = "text/javascript";
	  script.onload = function(){
	    if (callback) {
	      callback();
	    }
	  };

	  script.src = url;
	  document.getElementsByTagName("head")[0].appendChild(script);
	}

	if (!document.head.hasAttribute('superhuman-script-injected')) {
	  var gmailJsUrl = ("https://staging.superhuman.com") + '/~backend/build/gmail.js';
	  loadScript(gmailJsUrl);
	  document.head.setAttribute('superhuman-script-injected', 'true');
	}


/***/ }
/******/ ]);