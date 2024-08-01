const fs = require('fs');
const { createInstance } = require('../index.js'); // it should be require('polotno-node')
const { jsonToVideo } = require('../video-parallel.js'); // it should be require('polotno-node/video-parallel.js')

const { config } = require('dotenv');
config();

async function run() {
  console.time('render');
  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/private.json'));
  await jsonToVideo(
    () =>
      createInstance({
        key: process.env.POLOTNO_KEY,
      }),
    json,
    {
      out: 'out.mp4',
      // fps: 30,
      // quality: 1,
      // mimeType: 'image/jpeg',
      onProgress: (progress, frameTime) => {
        // console.log(progress, frameTime);
      },
    }
  );
  console.timeEnd('render');
  process.exit(0);
}

run().catch((e) => console.error(e));
