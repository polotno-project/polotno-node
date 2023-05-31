const fs = require('fs');
const { createInstance } = require('../instance.js');
const puppeteer = require('puppeteer');

const { jsonToVideoFile } = require('../video.js');

async function run() {
  // create working instance
  const instance = await createInstance({
    // this is a demo key just for that project
    // (!) please don't use it in your projects
    // to create your own API key please go here: https://polotno.dev/cabinet
    browser: await puppeteer.connect({
      browserWSEndpoint:
        'wss://chrome.browserless.io?token=207a1c64-56b3-4cae-8c4f-effc763d210c&--disable-web-security',
    }),
    key: 'nFA5H9elEytDyPyvKL7T',
    url: 'https://render-client.polotno.dev',
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/video.json'));
  const page = await instance.createPage();

  await jsonToVideoFile(page, json, { out: 'out.mp4' });

  await instance.close();
  process.exit(0);
}

run().catch((e) => console.error(e));
