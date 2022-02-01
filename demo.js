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
  const json = JSON.parse(fs.readFileSync('./test-data/custom-font.json'));

  await instance.run(async () => {
    window.config.addGlobalFont({
      fontFamily: 'Toyota-Bold',
      url: 'https://dd5bevh7dpeja.cloudfront.net/assetsForApi/fonts/InfinitiBrandCY-Regular.woff2',
    });
  });

  const imageBase64 = await instance.jsonToImageBase64(json);

  fs.writeFileSync('out.png', imageBase64, 'base64');
  const pdfBase64 = await instance.jsonToPDFBase64(json, { dpi: 300 });
  fs.writeFileSync('out2.pdf', pdfBase64, 'base64');

  // close instance
  instance.close();
}

run();
