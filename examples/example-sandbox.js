const fs = require('fs');
const path = require('path');
const { createInstance } = require('../index.js');

const { config } = require('dotenv');
config();

async function run() {
  // Ensure output directory exists
  const outDir = path.join(__dirname, 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // create working instance
  const instance = await createInstance({
    key: process.env.POLOTNO_KEY,
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/private.json'));

  const numFiles = 10; // Change this to generate the desired number of files
  const pdfOptions = {
    pixelRatio: 3,
    // quality: 0.8,
    // textSplitAllowed: true,
    // htmlTextRenderEnabled: true,
    // textVerticalResizeEnabled: true,
  };

  for (let i = 1; i <= numFiles; i++) {
    const base64 = await instance.jsonToPDFBase64(json, pdfOptions);

    const outPath = path.join(outDir, `out-${i}.pdf`);
    fs.writeFileSync(outPath, base64, 'base64');
    console.log(`Wrote: ${outPath}`);
  }

  await instance.close();
}

run();
