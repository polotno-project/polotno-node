const fs = require('fs');
const { createInstance } = require('../instance.js'); // it should be require('polotno-node/instance')
const { jsonToVideo } = require('../video-parallel.js'); // it should be require('polotno-node/video-parallel.js')
const puppeteer = require('puppeteer-core');

const { config } = require('dotenv');
config();

const RENDER_URL = process.env.RENDER_URL;

async function run() {
  console.time('render');
  // create working instance
  const browser = await puppeteer.connect({
    browserWSEndpoint: process.env.BROWSERLESS_URL,
  });

  const instance = await createInstance({
    key: process.env.POLOTNO_KEY,
    browser,
    url: RENDER_URL,
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/animation-3.json'));
  await jsonToVideo(() => instance, json, {
    out: 'out.mp4',
    pixelRatio: 0.2,
    keepInstance: true,
  });

  await instance.close();
  console.timeEnd('render');
  process.exit(0);
}

run().catch((e) => console.error(e));
