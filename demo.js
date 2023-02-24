const fs = require('fs');
const { createInstance } = require('./index.js');

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
  const json = JSON.parse(fs.readFileSync('./test-data/phil_homes.json'));
  let i = 0;
  setInterval(() => {
    instance
      .jsonToImageBase64(json)
      .then((data) => {
        i += 1;
        fs.writeFileSync('./out/out-' + i + '.png', data, 'base64');
      })
      .catch((e) => {
        // console.log('failed', e);
      });
  }, 1000);

  // fs.writeFileSync('out-2.png', binary, 'binary');
  // instance.close();
}

run();
