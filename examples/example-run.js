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
  const json = JSON.parse(fs.readFileSync('./test-data/small.json'));

  await instance.run(async (json) => {
    store.loadJSON(json);
    await store.waitLoading();
    const element = json.pages[0].children.find((c) => c.type === 'text');
    const text = new Konva.Text({
      text: 'This is very long text',
      fontSize: element.fontSize,
      // use old font family as fallback, until new font is loaded
      fontFamily: element.fontFamily,
      fontStyle: element.fontStyle + ' ' + element.fontWeight,
      letterSpacing: element.letterSpacing * element.fontSize,
    });
    const width = text.width();
  }, json);

  await instance.close();
}

run();
