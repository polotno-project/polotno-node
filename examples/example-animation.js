const fs = require('fs');
const { createInstance } = require('../index.js'); // it should be require('polotno-node')
const { jsonToVideo } = require('../video.js'); // it should be require('polotno-node/video')

const { config } = require('dotenv');
config();

async function run() {
  console.time('render');
  // create working instance
  const instance = await createInstance({
    key: process.env.POLOTNO_KEY,
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/animation-3.json'));
  const page = await instance.createPage();
  await jsonToVideo(page, json, { out: 'out.mp4' });

  await instance.close();
  console.timeEnd('render');
  process.exit(0);
}

run().catch((e) => console.error(e));
