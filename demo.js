const fs = require('fs');
const { createInstance } = require('./index.js');

async function run() {
  console.time('export');
  // create working instance
  const instance = await createInstance({
    // this is a demo key just for that project
    // (!) please don't use it in your projects
    // to create your own API key please go here: https://polotno.dev/cabinet
    key: 'lSz22QSOBQI0pXEm_0lm',
    useParallelPages: true,
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/polotno4_private.json'));
  setInterval(() => {
    instance
      .jsonToDataURL({ width: 'asdf' })
      .then((data) => {
        console.log('converted');
      })
      .catch((e) => {
        // console.log('failed', e);
      });
    instance.browser.pages().then((pages) => {
      console.log('pages', pages.length);
    });
  }, 5000);

  // fs.writeFileSync('out-2.png', binary, 'binary');
  console.timeEnd('export');
  // close instance
  // instance.close();
}

run();
