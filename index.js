let puppeteer = require('puppeteer-core');
const sparticuz = require('@sparticuz/chromium');
// TODO: that is a weird hack, but it works
const chrome = sparticuz.default || sparticuz;
const os = require('os');
const isMacOs = os.platform() === 'darwin';
const isWindows = os.platform() === 'win32' || os.platform() === 'win64';

// load full puppeteer on non linux platforms
if (isMacOs || isWindows) {
  puppeteer = require('puppeteer');
}

const { createInstance } = require('./instance');

const args = [
  'about:blank',
  '--disable-web-security',
  '--allow-file-access-from-files',
  '--allow-pre-commit-input',
  '--autoplay-policy=user-gesture-required',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-component-extensions-with-background-pages',
  '--disable-client-side-phishing-detection',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--proxy-server=direct://',
  '--proxy-bypass-list=*',
  '--disable-domain-reliability',
  '--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process,Translate,BackForwardCache,AvoidUnnecessaryBeforeUnloadCheckSync,IntensiveWakeUpThrottling',
  '--disable-extensions',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-notifications',
  '--disable-offer-store-unmasked-wallet-cards',
  '--disable-popup-blocking',
  '--disable-print-preview',
  '--disable-site-isolation-trials',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-setuid-sandbox',
  '--disable-speech-api',
  '--disable-sync',
  // Use srgb for identical output across Linux/macOS/Windows and to match how CSS colors/images are defined/assumed on the web.
  '--force-color-profile=srgb',
  '--hide-scrollbars',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--enable-automation',
  '--no-pings',
  '--no-sandbox',
  '--no-zygote',
  '--password-store=basic',
  '--allow-running-insecure-content',

  // Disable accessibility features to reduce resource usage and improve performance.
  '--disable-renderer-accessibility',
  // stable locale → font fallback/hyphenation
  '--lang=en-US',
  // this line  breaks the rendering on most of OS
  // it doesn't allow creating of pages
  //'--use-gl=swiftshader',
  '--disable-gpu',
  '--use-mock-keychain',
  '--enable-blink-features=IdleDetection',
  '--intensive-wake-up-throttling-policy=0',
  '--font-render-hinting=none',
  '--ignore-gpu-blocklist',
  // don't use this flag, because it makes renderign less accurate
  // see https://community.polotno.com/c/ask/the-ability-to-exclude-args-from-minimal_args-in-polotno-node
  // '--disable-font-subpixel-positioning',
  '--text-rendering=geometricprecision',
].filter(Boolean);

module.exports.args = args;

/**
 * Merges browser arguments intelligently, handling duplicates and conflicts.
 * Later arguments take precedence over earlier ones.
 * @param {...string[]} argArrays - Arrays of browser arguments to merge
 * @returns {string[]} Merged array of arguments
 */
function mergeArgs(...argArrays) {
  const argMap = new Map();
  const warnings = [];

  for (const argArray of argArrays) {
    for (const arg of argArray) {
      // Extract the flag name (before '=' if present)
      const flagMatch = arg.match(/^(--[^=]+)/);
      const flagName = flagMatch ? flagMatch[1] : arg;

      if (argMap.has(flagName)) {
        const existingArg = argMap.get(flagName);
        if (existingArg !== arg) {
          warnings.push(
            `Duplicate/conflicting flag detected: "${flagName}". Using: "${arg}" (overriding: "${existingArg}")`
          );
        }
      }

      argMap.set(flagName, arg);
    }
  }

  // Log warnings if any duplicates/conflicts were found
  if (warnings.length > 0) {
    // console.warn('Browser arguments merged with conflicts:');
    // warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  return Array.from(argMap.values());
}

const browserProps = {
  headless: 'new',
  // make large timeout, because some renders may take a lot of time
  // like large PDF or video render
  protocolTimeout: 60 * 60 * 1000,
  ignoreHTTPSErrors: true,
};

async function createBrowser({ browserArgs = [], ...rest } = {}) {
  return puppeteer.launch({
    args: mergeArgs(isWindows ? [] : chrome.args, args, browserArgs),
    defaultViewport: chrome.defaultViewport,

    executablePath:
      isMacOs || isWindows ? undefined : await chrome.executablePath(),
    ...browserProps,
    ...rest,
  });
}

module.exports.createBrowser = createBrowser;

module.exports.createInstance = async ({
  key,
  url,
  useParallelPages,
  browserArgs = [],
  browser,
  requestInterceptor,
} = {}) => {
  return await createInstance({
    browser: browser || (await createBrowser({ browserArgs })),
    key,
    url,
    useParallelPages,
    browserArgs,
    requestInterceptor,
  });
};
