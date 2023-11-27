const fs = require('fs');
const { createInstance } = require('../index.js');

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

  const setStoreSize = async (storeJson, width, height) => {
    return await instance.run(
      async (storeJson, width, height) => {
        store.loadJSON(storeJson);
        await store.waitLoading();
        store.setSize(width, height, true);
        return store.toJSON();
      },
      storeJson,
      width,
      height
    );
  };

  const storeJson = await setStoreSize(json, 842.4, 597.6);

  const base64 = await instance.jsonToImageBase64(storeJson, {});

  fs.writeFileSync('out.png', base64, 'base64');

  await instance.close();
}

run();
