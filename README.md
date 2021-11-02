# Polotno-node

Export Polotno JSON into images and pdf files. NodeJS package to work with [Polotno Store API](https://polotno.dev/).

## Usage

```bash
npm install polotno-node
```

```js
const fs = require('fs');
const { createInstance } = require('polotno-node');

async function run() {
  // create working instance
  const instance = await createInstance({
    // this is a demo key just for that project
    // (!) please don't use it in your projects
    // to create your own API key please go here: https://polotno.dev/cabinet
    key: 'nFA5H9elEytDyPyvKL7T',
  });

  // load sample json
  const json = JSON.parse(fs.readFileSync('polotno.json'));

  const imageBase64 = await instance.jsonToImageBase64(json);
  fs.writeFileSync('out.png', imageBase64, 'base64');

  // close instance
  instance.close();
}

run();
```

## API

### `instance.run()`

Run any Polotno store API directly inside web-page context

```js
// we can't directly use "json" variable inside the run function
// we MUST pass it as the second argument
const url = await instance.run(async (json) => {
  // you can use global "config" object that has some functions from "polotno/config" module
  window.config.addGlobalFont({
    name: 'MyCustomFont',
    url: 'https://example.com/font.otf',
  });

  // you can use global "store" object
  store.loadJSON(json);
  await store.waitLoading();
  return store.toDataURL();
}, json);
```

### `instance.jsonToDataURL(json, attrs)`

Export json into data URL.

```js
const json = JSON.parse(fs.readFileSync('polotno.json'));

const url = await instance.jsonToDataURL(json);
res.json({ url });
```

### `instance.jsonToImageBase64(json)`

Export json into base64 string of image.

```js
const json = JSON.parse(fs.readFileSync('polotno.json'));

const imageBase64 = await instance.jsonToImageBase64(json, {
  mimeType: 'image/png',
}); // also 'image/jpeg' is supported
fs.writeFileSync('out.png', imageBase64, 'base64');
```

### `instance.jsonToPDFBase64(json)`

Export json into base64 string of pdf file.

```js
const json = JSON.parse(fs.readFileSync('polotno.json'));

const pdfBase64 = await instance.jsonToPDFBase64(json);
fs.writeFileSync('out.pdf', pdfBase64, 'base64');
```
