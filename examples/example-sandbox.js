const fs = require('fs');
const { createInstance } = require('../index.js');

const { config } = require('dotenv');
config();

async function run() {
  // create working instance
  for (let i = 0; i < 10; i++) {
    (async () => {
      console.log(`Running ${i}...`);
      const instance = await createInstance({
        key: process.env.POLOTNO_KEY,
      });

      // load sample json
      const json = JSON.parse(fs.readFileSync('./test-data/private.json'));

      const base64 = await instance.jsonToImageBase64(json, {
        htmlTextRenderEnabled: true,
        pixelRatio: 0.2,
      });

      fs.writeFileSync(`./outs/out-${i}.png`, base64, 'base64');

      await instance.close();
    })();
  }
}

run();
