const fs = require('fs');
const { createInstance } = require('./index.js');

const { jsonToGifFile } = require('./gif.js');

async function run() {
  console.time('export');
  // create working instance
  const instance = await createInstance({
    // this is a demo key just for that project
    // (!) please don't use it in your projects
    // to create your own API key please go here: https://polotno.dev/cabinet
    key: 'nFA5H9elEytDyPyvKL7T',
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/video.json'));
  const page = await instance.createPage();
  await jsonToGifFile(page, json, { out: 'out.gif' });

  console.log('done');
  // fs.writeFileSync('out-2.png', binary, 'binary');
  instance.close();
}

run().catch((e) => console.error(e));
