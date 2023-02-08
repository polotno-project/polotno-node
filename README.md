# Polotno-node

Export Polotno JSON into images and pdf files. NodeJS package to work with [Polotno Store API](https://polotno.dev/).
Should work fine with lambda functions as well.

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

### `createInstance(options)`

Create working instance of Polotno Node.

```js
const { createInstance } = require('polotno-node');
const instance = await createInstance({
  // this is a demo key just for that project
  // (!) please don't use it in your projects
  // to create your own API key please go here: https://polotno.dev/cabinet
  key: 'nFA5H9elEytDyPyvKL7T',
  // useParallelPages - use parallel pages to speed up rendering
  // you can use false only for sequential calls
  // it may break rendering if you call many parallel requests
  // default is true
  useParallelPages: false,
  // url - url of the Polotno Client Editor
  // client editor is just simple public html page that have `store` as global variable
  // by default it will run local build
  url: 'https://yourappdomain.com/client',
  // browser - puppeteer browser instance
  // by default it will use chrome-aws-lambda
  // useful to set your own rendering props or use browserless
  browser: browser,
});
```

### `instance.jsonToDataURL(json, attrs)`

Export json into data URL.

```js
const json = JSON.parse(fs.readFileSync('polotno.json'));

// by default it will export first page only
const url = await instance.jsonToDataURL(json);
res.json({ url });

// export many pages:
for (const page of json.pages) {
  const url = await instance.jsonToDataURL(
    { ...json, pages: [page] }, // for optimization, we can modify JSON to include only one page
    { pageId: page.id }
  );
  // do something with url
}
```

### `instance.jsonToImageBase64(json, attrs)`

Export json into base64 string of image.

```js
const json = JSON.parse(fs.readFileSync('polotno.json'));

// by default it will export first page only
const imageBase64 = await instance.jsonToImageBase64(json, {
  mimeType: 'image/png',
}); // also 'image/jpeg' is supported
fs.writeFileSync('out.png', imageBase64, 'base64');

// export many pages:
for (const page of json.pages) {
  const imageBase64 = await instance.jsonToImageBase64(
    { ...json, pages: [page] }, // for optimization, we can modify JSON to include only one page
    { pageId: page.id }
  );
  // do something with base64
}
```

### `instance.jsonToPDFBase64(json, attrs)`

Export json into base64 string of pdf file.

```js
const json = JSON.parse(fs.readFileSync('polotno.json'));

// it will export all pages in the JSON
const pdfBase64 = await instance.jsonToPDFBase64(json);
fs.writeFileSync('out.pdf', pdfBase64, 'base64');
```

### `instance.jsonToPDFDataURL(json, attrs)`

Export json into data url of pdf file.

```js
const json = JSON.parse(fs.readFileSync('polotno.json'));

const url = await instance.jsonToPDFDataURL(json);
res.json({ url });
```

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

## Your own client

By default `polotno-node` ships with the default Polotno Editor with its (hopefully) last version. If you use experimental API such as `unstable_registerShapeModel` and `unstable_registerShapeComponent`, the rendering may fail if you use unknow elements types.

In that case you can use your own client editor. You need to create a public html page with `store` as global variable and mount just `<Workspace />` component from `polotno/canvas` module. Take a look into `client.html` file and `client.js` file in this repo as a demo. In your own version of the Editor you can use experimental API to define custom components.

Pass `url` option to `createInstance` function with public url of your client editor.

```js
const { createInstance } = require('polotno-node');

const instance = await createInstance({
  key: 'KEY',
  url: 'https://yourappdomain.com/client',
});
```

## Browserless usage

By default `polotno-node` will import browser bundle using `chrome-aws-lambda`. But you can use `browserless` instead, to keep your cloud function smaller.

```js
const { createInstance } = require('polotno-node/instance');
const puppeteer = require('puppeteer');

const instance = await createInstance({
  key: 'nFA5H9elEytDyPyvKL7T',
  browser: await puppeteer.connect({
    browserWSEndpoint: 'wss://chrome.browserless.io?token=API_KEY',
  }),
});
```

## Troubleshooting

If you have an error like this

```
Unhandled Promise Rejection 	{"errorType":"Runtime.UnhandledPromiseRejection","errorMessage":"Error: Evaluation failed: ReferenceError: store is not defined\n    at __puppeteer_evaluation_script__:3:9"
```

It may mean that Polotno Client Editor was not loaded in `puppeteer` instance. It is possible that you are missing required files in `node_modules` folder. I got this error when I was trying to run `polotno-node` on Vercel. To fix the issue you need to add this config into `vercel.json`:

```
"functions": {
  "api/render.js": { // remember to replace this line with your function name
    "includeFiles": "node_modules/polotno-node/**"
  },
}
```
