const fs = require('fs');
const { createInstance } = require('./index.js');

async function run() {
  console.time('export');
  // create working instance
  const instance = await createInstance({
    // this is a demo key just for that project
    // (!) please don't use it in your projects
    // to create your own API key please go here: https://polotno.dev/cabinet
    key: 'lSz22QSOBQI0pXEm_0lm',
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/polotno4_private.json'));

  // json.pages.forEach((page, index) => {
  const base64 = await instance.jsonToImageBase64(json, {
    // quality: 0.6,
    // parallel: 7,
  });
  fs.writeFileSync('out.png', base64, 'base64');
  console.timeEnd('export');
  // close instance
  instance.close();
}

run();
