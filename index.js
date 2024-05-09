let puppeteer = require('puppeteer-core');
const chrome = require('@sparticuz/chromium');
const os = require('os');
const isMacOs = os.platform() === 'darwin';
const isWindows = os.platform() === 'win32' || os.platform() === 'win64';

// load full puppeteer on non linux platforms
if (isMacOs || isWindows) {
  puppeteer = require('puppeteer');
}

const { createInstance } = require('./instance');

const minimal_args = [
  'about:blank',
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
  '--no-proxy-server',
  "--proxy-server='direct://'",
  '--proxy-bypass-list=*',
  '--disable-domain-reliability',
  '--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process,Translate,BackForwardCache,AvoidUnnecessaryBeforeUnloadCheckSync,IntensiveWakeUpThrottling',
  '--disable-extensions',
  '--disable-features=AudioServiceOutOfProcess',
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
  '--force-color-profile=srgb',
  '--hide-scrollbars',
  '--ignore-gpu-blacklist',
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

  // this line  breaks the rendering on most of OS
  // it doesn't allow creating of pages
  //'--use-gl=swiftshader',
  '--disable-gpu',
  '--use-mock-keychain',
  '--enable-blink-features=IdleDetection',
  '--intensive-wake-up-throttling-policy=0',
  '--font-render-hinting=none',
  '--ignore-gpu-blocklist',
  '--disable-font-subpixel-positioning',
  '--force-color-profile=generic-rgb',
  '--text-rendering=geometricprecision',
].filter(Boolean);

async function createBrowser({ browserArgs = [], ...rest } = {}) {
  return puppeteer.launch({
    args: [
      ...chrome.args,
      ...minimal_args,
      '--disable-web-security',
      '--allow-file-access-from-files',
      // more info about --disable-dev-shm-usage
      // https://github.com/puppeteer/puppeteer/issues/1175#issuecomment-369728215
      // https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#tips
      ...browserArgs,
    ],
    defaultViewport: chrome.defaultViewport,
    headless: 'new',
    // make default protocol timeout bigger
    // because some clients had issues with it
    protocolTimeout: 10 * 60 * 1000,
    executablePath:
      isMacOs || isWindows ? undefined : await chrome.executablePath(),
    ignoreHTTPSErrors: true,
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
} = {}) => {
  return await createInstance({
    browser: browser || (await createBrowser({ browserArgs })),
    key,
    url,
    useParallelPages,
    browserArgs,
  });
};
