/* This is injected into the fake page:
 * https://mail.superhuman.com/~extension/oauth2redirect
 * which forwards the Oauth2 response from gmail back to the extension.
 *
 * window.opener is used for popups (non-immediate mode)
 * window.parent is used for iframes (immediate mode)
 */
(window.opener || window.parent).postMessage({response: document.location.hash.replace(/^#/,'')}, chrome.runtime.getURL(""));
