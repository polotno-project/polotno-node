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

module.exports.createInstance = async ({
  key,
  url,
  useParallelPages,
  browserArgs = [],
} = {}) => {
  const browser = await puppeteer.launch({
    args: [
      ...chrome.args,
      '--no-sandbox',
      '--hide-scrollbars',
      '--disable-web-security',
      '--allow-file-access-from-files',
      // more info about --disable-dev-shm-usage
      // https://github.com/puppeteer/puppeteer/issues/1175#issuecomment-369728215
      // https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#tips
      '--disable-dev-shm-usage',
      ...browserArgs,
    ],
    defaultViewport: chrome.defaultViewport,
    headless: 'new',
    executablePath: isMacOs ? undefined : await chrome.executablePath(),
    ignoreHTTPSErrors: true,
  });

  return await createInstance({
    browser,
    key,
    url,
    useParallelPages,
    browserArgs,
  });
};
