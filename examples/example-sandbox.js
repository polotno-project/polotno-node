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

  // duplicate pages multiple times
  const originalPages = json.pages;
  const numCopies = 20; // adjust number of copies as needed

  json.pages = [];
  for (let i = 0; i < numCopies; i++) {
    // clone pages and update IDs
    const duplicatedPages = originalPages.map((page) => ({
      ...page,
      id: `${page.id}-copy-${i}`,
    }));
    json.pages.push(...duplicatedPages);
  }

  fs.writeFileSync('out-large.json', JSON.stringify(json, null, 2));

  console.log('here');

  const base64 = await instance.jsonToPDFBase64(json, {
    onProgress: (progress) => {
      console.log('progress', progress);
    },
    // htmlTextRenderEnabled: true,
  });

  fs.writeFileSync('out.pdf', base64, 'base64');

  await instance.close();
}

run();
