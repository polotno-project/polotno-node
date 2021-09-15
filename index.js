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

  return {
    close: async () => await browser.close(),
    run,
    jsonToDataURL: async (json, attrs) => {
      return await run(
        async (json, attrs) => {
          store.loadJSON(json);
          await store.waitLoading();
          console.log(JSON.stringify(attrs));
          return store.toDataURL(attrs);
        },
        json,
        attrs
      );
    },
    jsonToImageBase64: async (json, attrs) => {
      return await run(
        async (json, attrs) => {
          store.loadJSON(json);
          await store.waitLoading();
          const url = store.toDataURL();
          return url.split('base64,')[1];
        },
        json,
        attrs
      );
    },
    jsonToPDFBase64: async (json, attrs) => {
      return await run(
        async (json, attrs) => {
          store.loadJSON(json);
          await store.waitLoading();
          const url = await store.toPDFDataURL(attrs);
          return url.split('base64,')[1];
        },
        json,
        attrs
      );
    },
  };
};
