const puppeteer = require('puppeteer');
const path = require('path');

module.exports.createInstance = async ({ key } = {}) => {
  const browser = await puppeteer.launch({});
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

  await page.goto(
    `file:${path.join(__dirname, 'dist', 'client.html')}?key=${key}`
  );

  const run = async (func, ...args) => {
    return await page.evaluate(func, ...args);
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
