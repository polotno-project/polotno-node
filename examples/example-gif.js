const fs = require('fs');
const { createInstance } = require('../index.js');

const { config } = require('dotenv');
config();

async function run() {
  // create working instance
  const instance = await createInstance({
    key: process.env.POLOTNO_KEY,
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/sample_private.json'));

  const base64 = await instance.jsonToGIFBase64(json, { pixelRatio: 0.2 });

  fs.writeFileSync('out.gif', base64, 'base64');

  await instance.close();
}

run();
