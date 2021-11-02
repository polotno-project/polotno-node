const chrome = require('chrome-aws-lambda');
const puppeteer = require('puppeteer');
const path = require('path');

const DEFAULT_CLIENT = `file:${path.join(__dirname, 'dist', 'client.html')}`;

const getNewPage = async (browser, url) => {
  const page = await browser.newPage();

  page.on('console', (msg) => {
    msg.args().forEach((message) => {
      // skip style information
      if (message.toString().indexOf('margin') >= 0) {
        return;
      }
      const text = message
        .toString()
        .replace('JSHandle:', '')
        .replace('%c', '');
      console.log(text);
    });
  });

  await page.goto(url);

  return page;
};

module.exports.createInstance = async ({ key, url, useParallelPages } = {}) => {
  const browser = await puppeteer.launch({
    args: [
      ...chrome.args,
      '--no-sandbox',
      '--hide-scrollbars',
      '--disable-web-security',
      '--allow-file-access-from-files',
    ],
    defaultViewport: chrome.defaultViewport,
    executablePath: await chrome.executablePath,
    headless: true,
    ignoreHTTPSErrors: true,
  });
  const visitPage = url || `${DEFAULT_CLIENT}?key=${key}`;

  const firstPage = await getNewPage(browser, visitPage);

  const run = async (func, ...args) => {
    const page = useParallelPages
      ? await getNewPage(browser, visitPage)
      : firstPage;

    const result = await page.evaluate(func, ...args);
    if (useParallelPages) {
      page.close();
    }
    return result;
  };

  const jsonToDataURL = async (json, attrs) => {
    return await run(
      async (json, attrs) => {
        const pixelRatio = attrs.pixelRatio || 1;
        store.loadJSON(json);
        store.setElementsPixelRatio(pixelRatio);
        await store.waitLoading();
        return store.toDataURL({ ...attrs, pixelRatio });
      },
      json,
      attrs || {}
    );
  };

  const jsonToImageBase64 = async (json, attrs) => {
    const url = await jsonToDataURL(json, attrs);
    return url.split('base64,')[1];
  };

  return {
    close: async () => await browser.close(),
    run,
    jsonToDataURL,
    jsonToImageBase64,
    jsonToPDFBase64: async (json, attrs) => {
      return await run(
        async (json, attrs) => {
          store.loadJSON(json);
          await store.waitLoading();
          const url = await store.toPDFDataURL(attrs);
          return url.split('base64,')[1];
        },
        json,
        attrs || {}
      );
    },
  };
};
