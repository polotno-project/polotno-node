const fs = require('fs');
const { createInstance } = require('./index');

async function run() {
  // create working instance
  const instance = await createInstance({
    // this is a demo key just for that project
    // (!) please don't use it in your projects
    // to create your own API key please go here: https://polotno.dev/cabinet
    key: 'nFA5H9elEytDyPyvKL7T',
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/polotno2.json'));

  console.time('export');

  const imageBase64 = await instance.jsonToImageBase64(json, {
    pixelRatio: 6,
  });
  fs.writeFileSync('out.png', imageBase64, 'base64');
  console.timeEnd('export');

  const pdfBase64 = await instance.jsonToPDFBase64(json, { dpi: 300 });
  fs.writeFileSync('out2.pdf', pdfBase64, 'base64');

  // close instance
  instance.close();
}

run();
