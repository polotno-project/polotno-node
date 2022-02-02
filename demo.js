const fs = require('fs');
const { createInstance } = require('./index');

async function run() {
  // create working instance
  const instance = await createInstance({
    // this is a demo key just for that project
    // (!) please don't use it in your projects
    // to create your own API key please go here: https://polotno.dev/cabinet
    key: 'nFA5H9elEytDyPyvKL7T',
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('./test-data/polotno_11.json'));

  const pages = json.pages;

  // json.pages = json.pages.slice(11, 13);

  // const imageBase64 = await instance.jsonToImageBase64(json);

  // fs.writeFileSync('out.png', imageBase64, 'base64');
  // console.time('each');
  // let interval = setInterval(() => {
  //   instance.run(() => {
  //     store.activePage.children.forEach((child) => {
  //       console.log(child.id, child.__isLoaded);
  //     });
  //   });
  // }, 1000);
  // for (let i = 0; i < pages.length; i++) {
  //   const page = pages[i];
  //   // page.children = page.children.filter((child) => child.type === 'svg');
  //   json.pages = [page];
  //   console.log('page', page.id);
  //   const pdfBase64 = await instance.jsonToPDFBase64(json);
  //   fs.writeFileSync(i + 'out.pdf', pdfBase64, 'base64');
  // }
  // console.timeEnd('each');
  console.time('all');
  json.pages = pages;
  // json.pages.forEach((page, index) => {
  const pdfBase64 = await instance.jsonToPDFBase64(json);
  fs.writeFileSync('out.pdf', pdfBase64, 'base64');
  console.timeEnd('all');
  // clearInterval(interval);
  //   console.log('page', index);
  // });

  // close instance
  instance.close();
}

run();
