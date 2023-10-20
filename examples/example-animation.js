const fs = require('fs');
const { createInstance } = require('../index.js');
const { jsonToVideo } = require('../video.js');

async function run() {
  // create working instance
  const instance = await createInstance({
    key: 'nFA5H9elEytDyPyvKL7T',
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/animation-2.json'));
  const page = await instance.createPage();

  await jsonToVideo(page, json, { out: 'out.mp4' });

  await instance.close();
  process.exit(0);
}

run().catch((e) => console.error(e));
