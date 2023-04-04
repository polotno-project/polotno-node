const fs = require('fs');
const { createInstance } = require('./index.js');

async function run() {
  // create working instance
  const instance = await createInstance({
    // this is a demo key just for that project
    // (!) please don't use it in your projects
    // to create your own API key please go here: https://polotno.dev/cabinet
    key: 'nFA5H9elEytDyPyvKL7T',
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/sample_private.json'));

  await instance.run(async () => {
    for (let i = 0; i < 100; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log(i);
    }
  });
  // const base64 = await instance.jsonToImageBase64(json);
  // fs.writeFileSync('out.png', base64, 'base64');

  console.log('done');
  // fs.writeFileSync('out-2.png', binary, 'binary');
  await instance.close();
}

run();
