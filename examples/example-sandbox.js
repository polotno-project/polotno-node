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

  const base64 = await instance.jsonToPDFBase64(json, {
    htmlTextRenderEnabled: true,
    pageIds: ['FbU0890OUgesndg8rBCZ4', 'NOlea6ivHc79Z-eZJZfUP'],
  });

  fs.writeFileSync('out.pdf', base64, 'base64');

  await instance.close();
}

run();
