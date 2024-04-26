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
  const json = JSON.parse(fs.readFileSync('./test-data/template_private.json'));
  // json.pages = json.pages.slice(0, 2);

  const base64 = await instance.jsonToPDFBase64(json, {
    skipFontError: true,
  });

  fs.writeFileSync('out.pdf', base64, 'base64');

  await instance.close();
}

run();
