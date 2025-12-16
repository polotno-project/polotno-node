const fs = require('fs');
const { createInstance, createBrowser } = require('../index.js');

const { config } = require('dotenv');
config();

async function run() {
  const browser = await createBrowser({
    userDataDir: './user-data',
  });
  // create working instance
  const instance = await createInstance({
    key: process.env.POLOTNO_KEY,
    browser,
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/temp.json'));

  const base64 = await instance.jsonToImageBase64(json);

  fs.writeFileSync('out.png', base64, 'base64');

  await instance.close();
}

run();
