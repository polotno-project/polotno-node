const fs = require('fs');
const { createInstance, createBrowser } = require('../index.js');

async function run() {
  const browser = await createBrowser({
    userDataDir: './user-data',
  });
  // create working instance
  const instance = await createInstance({
    // this is a demo key just for that project
    // (!) please don't use it in your projects
    // to create your own API key please go here: https://polotno.dev/cabinet
    key: 'nFA5H9elEytDyPyvKL7T',
    browser,
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/temp.json'));

  const base64 = await instance.jsonToImageBase64(json);

  fs.writeFileSync('out.png', base64, 'base64');

  await instance.close();
}

run();
