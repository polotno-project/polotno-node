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
  const json = JSON.parse(fs.readFileSync('./test-data/v-align.json'));
  const jsonToDataURL = async (json, attrs) => {
    return await instance.run(
      async (json, attrs) => {
        const pixelRatio = attrs.pixelRatio || 1;
        window.config.unstable_setTextOverflow('resize');
        window.config.unstable_setTextVerticalResizeEnabled(true);
        store.loadJSON(json);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await store.waitLoading();
        return store.toDataURL({ ...attrs, pixelRatio });
      },
      json,
      attrs || {}
    );
  };

  const jsonToImageBase64 = async (json, attrs) => {
    const url = await jsonToDataURL(json, attrs);
    return url.split('base64,')[1];
  };

  const base64 = await jsonToImageBase64(json);
  fs.writeFileSync('out.png', base64, 'base64');

  console.log('done');
  // fs.writeFileSync('out-2.png', binary, 'binary');
  instance.close();
}

run();
