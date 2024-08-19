const fs = require('fs');
const { createInstance } = require('../index.js'); // it should be require('polotno-node')
const { jsonToVideo } = require('../video-parallel.js'); // it should be require('polotno-node/video-parallel.js')

const { config } = require('dotenv');
config();

async function run() {
  console.time('render');
  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/video-2.json'));
  await jsonToVideo(
    () =>
      createInstance({
        key: process.env.POLOTNO_KEY,
        executablePath:
          process.platform === 'darwin'
            ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            : undefined,
      }),

    json,

    {
      out: 'out.mp4',
      skipWebm: true,
      fps: 10,
      onProgress: (progress, frameTime) => {
        console.log('progress', progress);
      },
    }
  );
  console.timeEnd('render');
  process.exit(0);
}

run().catch((e) => console.error(e));
