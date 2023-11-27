const fs = require('fs');
const { createInstance } = require('../index.js'); // it should be require('polotno-node')
const { jsonToVideo } = require('../video-parallel.js'); // it should be require('polotno-node/video-parallel.js')

const { config } = require('dotenv');
config();

async function run() {
  console.time('render');
  // load sample json
  const json = JSON.parse(
    fs.readFileSync('./test-data/animation-with-transparent-background.json')
  );
  await jsonToVideo(
    () =>
      createInstance({
        key: process.env.POLOTNO_KEY,
      }),
    json,
    { out: 'out.webm', parallel: 1, fps: 30 }
  );
  console.timeEnd('render');
  process.exit(0);
}

run().catch((e) => console.error(e));
