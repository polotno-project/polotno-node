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

  const blob = await instance.jsonToBlob(json);

  fs.writeFileSync('out.png', blob, 'binary');

  await instance.close();
}

run();
