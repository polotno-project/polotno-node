const fs = require('fs');
const { createInstance } = require('../index.js');

async function run(index) {
  // create working instance
  const instance = await createInstance({
    // this is a demo key just for that project
    // (!) please don't use it in your projects
    // to create your own API key please go here: https://polotno.dev/cabinet
    key: 'nFA5H9elEytDyPyvKL7T',
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/private.json'));

  const base64 = await instance.jsonToPDFBase64(json, {
    skipImageError: true,
    skipFontError: true,
    htmlTextRenderEnabled: true,
    textVerticalResizeEnabled: true,
    onProgress: (progress) => {
      console.log(index, 'progress', progress);
    },
  });

  fs.writeFileSync(`out-${index}.pdf`, base64, 'base64');

  await instance.close();
}

run(1);
run(2);
run(3);
// run(4);
// run(5);
