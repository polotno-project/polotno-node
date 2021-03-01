const puppeteer = require('puppeteer');
const path = require('path');

module.exports.createInstance = async ({ key } = {}) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', (msg) => {
    for (let i = 0; i < msg.args().length; ++i)
      console.log(`${i}: ${msg.args()[i]}`);
  });

  await page.goto(
    `file:${path.join(__dirname, 'dist', 'client.html')}?key=${key}`
  );

  return {
    close: async () => await browser.close(),
    run: async (func, ...args) => {
      return await page.evaluate(func, ...args);
    },
    jsonToDataURL: async (json) => {
      return await instance.run(async (json) => {
        store.loadJSON(json);
        await store.waitLoading();
        return store.toDataURL();
      }, json);
    },
  };
};
