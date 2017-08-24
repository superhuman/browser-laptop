/**
 * This is injected into all pages on process.env.SERVER_ORIGIN
 * so the web can detect if the extension is loaded.
 */
document.documentElement.classList.add("superhumanIsInstalled");
