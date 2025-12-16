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
  const json = JSON.parse(fs.readFileSync('./test-data/private.json'));

  const base64 = await instance.jsonToImageBase64(json, {
    textOverflow: 'resize',
    mimeType: 'image/jpeg',
  });

  fs.writeFileSync('out.jpeg', base64, 'base64');

  await instance.close();
}

run();
