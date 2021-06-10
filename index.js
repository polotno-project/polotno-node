const puppeteer = require('puppeteer');
const path = require('path');

module.exports.createInstance = async ({ key } = {}) => {
  const browser = await puppeteer.launch({});
  const page = await browser.newPage();

  page.on('console', (msg) => {
    msg.args().forEach(message => {
      // skip style information
      if (message.toString().indexOf('margin') >= 0) {
        return;
      }
      const text = message.toString().replace('JSHandle:', '').replace('%c', '');
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
    jsonToDataURL: async (json) => {
      return await run(async (json) => {
        store.loadJSON(json);
        await store.waitLoading();
        return store.toDataURL();
      }, json);
    },
    jsonToImageBase64: async (json) => {
      return await run(async (json) => {
        store.loadJSON(json);
        await store.waitLoading();
        const url = store.toDataURL();
        return url.split('base64,')[1];
      }, json);
    },
    jsonToPDFBase64: async (json) => {
      return await run(async (json) => {
        store.loadJSON(json);
        await store.waitLoading();
        const url = await store.toPDFDataURL();
        return url.split('base64,')[1];
      }, json);
    },
  };
};
