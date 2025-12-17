const fs = require('fs');
const { createInstance } = require('../index.js');

const { config } = require('dotenv');
config();

async function run() {
  // create working instance
  const instance = await createInstance({
    key: process.env.POLOTNO_KEY,
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/medium-video.json'));
  console.time('rendering');
  const base64 = await instance.jsonToVideoBase64(json, {
    onProgress: (progress, frameTime) => {
      console.log('progress', progress, frameTime);
    },
    fps: 30,
    // profilePath: 'video-profile.cpuprofile',
  });

  fs.writeFileSync('out.mp4', base64, 'base64');
  console.timeEnd('rendering');

  await instance.close();
  process.exit(0);
}

run().catch((e) => console.error(e));
