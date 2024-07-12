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

### `instance.jsonToGIFDataURL(json, attrs)`

Export json into data url of GIF file with animations

```js
const json = JSON.parse(fs.readFileSync('polotno.json'));

const url = await instance.jsonToGIFDataURL(json);
res.json({ url });
```

### `instance.jsonToGIFBase64(json, attrs)`

Export json into data url of GIF file with animations

```js
const json = JSON.parse(fs.readFileSync('polotno.json'));

const base64 = await instance.jsonToGIFBase64(json);
fs.writeFileSync('out.gif', base64, 'base64');
```

### `attrs` usage

**NOTE: all export API will pass `attrs` object into relevant export function from `store`.**

```js
const url = await instance.jsonToDataURL(json, { pixelRatio: 0.2 });
// under the hood it will call:
// const url = await store.toDataURL({ pixelRatio: 0.2 });
```

### `attrs.assetLoadTimeout`

You can add `assetLoadTimeout` attribute to `attrs` object. It will be used to set timeout for loading assets. By default it is 30000ms.

```js
const url = await instance.jsonToPDFDataURL(json, { assetLoadTimeout: 60000 });
```

### `attrs.assetFontTimeout`

Timeout for loading fonts. By default it is 6000ms.

```js
const url = await instance.jsonToPDFDataURL(json, { assetFontTimeout: 10000 });
```

### `attrs.htmlTextRenderEnabled`

Enabled experimental HTML text rendering. By default it is `false`.

```js
const url = await instance.jsonToPDFDataURL(json, {
  htmlTextRenderEnabled: true,
});
```

### `attrs.textVerticalResizeEnabled`

Enabled vertical text resize and align. By default it is `false`.

```js
const url = await instance.jsonToPDFDataURL(json, {
  textVerticalResizeEnabled: true,
});
```

### `attrs.skipFontError`

If `skipFontError` is true, it will not throw error font is not loaded or not defined. By default it is `false`.

```js
const url = await instance.jsonToPDFDataURL(json, {
  skipFontError: true,
});
```

### `attrs.textOverflow`

Control behavior of text on its overflow. Default is `change-font-size`. It means it will automatically reduce font size to fit text into the box. Other options are:

- `resize` (change text element height to make text fit)
- `ellipsis` (add ellipsis to the end of the text)

```js
const url = await instance.jsonToPDFDataURL(json, {
  textOverflow: 'resize',
});
```

### `instance.run()`

Run any Polotno store API directly inside web-page context.

**Warning: by default every `run` and every export function will create a new page with its own editor and context.** If you want to make and export after you use `instance.run()` you must do it inside the same `run` function.

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

### `window.config` usage

`window.config` is a global object that has some functions from `polotno/config` module. You can use it to add custom fonts and customize some settings.
Not all options are supported yet. If you see anything missing, please create an issue. You can see all available options in `client.js` file.

You should be able to change config before you call `store.loadJSON` function and do you export.

```js
const url = await instance.run(async (json) => {
  // you can use global "config" object that has some functions from "polotno/config" module
  window.config.unstable_setTextVerticalResizeEnabled(true);
  // you can use global "store" object
  store.loadJSON(json);
  return store.toDataURL();
}, json);
```

## Video export

**This part is currently under development and API will change.**

You may need to have ffmpeg available in your system to make it work.
Also you need to manually dependencies:

```bash
npm install fluent-ffmpeg axios
```

```js
import { createInstance } from 'polotno-node';
import { jsonToVideo } from 'polotno-node/video-parallel';

// load sample json
const json = JSON.parse(fs.readFileSync('./test-data/video.json'));

await jsonToVideo(
  // first argument is a function that returns an instance
  // it can be a new instance on every call (useful for parallel rendering on local machine)
  // or it can be a single instance (useful for cloud functions)
  () =>
    createInstance({
      key: '...key...',
    }),
  json,
  {
    out: 'out.mp4', // output file name
    parallel: 4, // number of parallel rendering processes
    fps: 15, // frames per second
    keepInstance: false, // keep instance open after rendering, make sure to use true if use just one instance
  }
);
```

## Your own client

By default `polotno-node` ships with the default Polotno Editor with its (hopefully) last version. If you use experimental API such as `unstable_registerShapeModel` and `unstable_registerShapeComponent`, the rendering may fail if you use unknown elements types.

In that case you can use your own client editor. You need to create a public html page with `store` as global variable and mount just `<Workspace />` component from `polotno/canvas` module. Take a look into `client.html` file and `client.js` file in this repo as a demo. In your own version of the Editor you can use experimental API to define custom components.

Pass `url` option to `createInstance` function with public url of your client editor.

**Note: you will have to maintain the last version of your client editor by yourself. Better to keep using the last **

```js
const { createInstance } = require('polotno-node');

const instance = await createInstance({
  key: 'KEY',
  url: 'https://yourappdomain.com/client',
});
```

## Usage on the cloud

`polotno-node` should work by default on AWS Lambda. But in some cloud providers you may need to do extra steps to reduce function size.

### AWS EC2

EC2 has some troubles with loading fonts. To fix the issue install Google Chrome, it will load all required libraries.

```bash
curl https://intoli.com/install-google-chrome.sh | bash
```

Got it from here: https://github.com/puppeteer/puppeteer/issues/765#issuecomment-353694116

### Browserless usage

You can speed up your function execution a lot, if instead of using full browser you will use [browserless.io](https://browserless.io/) service. It is a paid service not affiliated with Polotno.

Using browserless.io you can also make your function much smaller in size, so it will be possible to deploy to cloud provider with smaller limits, like Vercel.

```js
const { createInstance } = require('polotno-node/instance');
const puppeteer = require('puppeteer');

const instance = await createInstance({
  key: 'nFA5H9elEytDyPyvKL7T',
  browser: await puppeteer.connect({
    browserWSEndpoint: 'wss://chrome.browserless.io?token=API_KEY',
  }),
  url: 'https://yourappdomain.com/client', // see "Your own client" section
});
```

### Minimal usage

Also you can use [@sparticuz/chromium-min](https://github.com/Sparticuz/chromium#-min-package) to reduce function size. Make sure it is caching chromium binary in your cloud provider. Looks like Vercel is NOT doing that!

```bash
npm install @sparticuz/chromium-min
```

```js
const { createInstance } = require('polotno-node/instance');
const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

const makeInstance = async () => {
  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--hide-scrollbars',
      '--disable-web-security',
      '--allow-file-access-from-files',
      // more info about --disable-dev-shm-usage
      // https://github.com/puppeteer/puppeteer/issues/1175#issuecomment-369728215
      // https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#tips
      '--disable-dev-shm-usage',
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v110.0.1/chromium-v110.0.1-pack.tar'
    ),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  return await createInstance({
    key: 'your-key',
    browser,
  });
};

const instance = await makeInstance();
```

## AWS lambda with Layer configuration

In order to run the **polotno-node** in AWS Lambda, it's recommended to use a [Lambda Layer configurations](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html) which will manage the dependencies, like **chronium**.
In addition, the Lambda's configuration needs to be changed as well. It's recommeded to change the **timeout** to 30 seconds instead of default value (3 seconds) and **Memory limit** increase to minimum 512 Mb instead of 128 mb ( default value ).

Dependencies:

- @sparticuz/chromium
- puppeteer-core
- polotno-node

Pre-requirements:

- The chronium and puppeteer versions need to be satisfied. Please check this [document](https://pptr.dev/supported-browsers).
- The **minumum Memory limit** needs to be `512 Mb` for AWS Lambda. Default is `128 Mb`.
- The **timeout** should be increased from default 3 seconds to higher value, for example up to 30 seconds. It depends on the Memory limit. For instance, if the memory limit was set to 1024, the polotno process might take ~15 secs, if 512 mb, ~30sec.

==========================================

How to create a configuration layer with a dependency on `chronium` ?

1. Create a `.zip` file from a chronium project. For example:

```
mkdir chronium-112 && cd chronium-112
npm init -y
npm install @sparticuz/chromium@112.0
zip -r chronium.zip ./*
```

2. Go to AWS console then open a Lambda section and click on `Layers`.
3. Following the [documentation](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html) create a Layer with a chrnioum dependency by uploading a zip file. Keep in mind that environment like `nodejs18.x` should match between layer and function.

> Approximatelly, the size of the zip, will be around `73 Mb`, so in order to upload, the S3 service will be needed. 4. Finally, open the Lambda function, select a `Code` section, at the bottom click on `Add Layer` and select a created layer.

==========================================

How to run the full example with aws-cli ?

- Create a Lambda configuration layer, and upload a **.zip** archive which stores a **chronium** npm or git package.

```
export CH_VERSION=112.0
export BUCKET=example-bucket
export AWS_ACC_ID=000000000000
// create a chronium project for Layer
mkdir chronium-layer
cd chronium-layer
npm init -y
npm install @sparticuz/chromium@${CH_VERSION}
zip -r chronium.zip ./*
aws s3 cp chronium.zip s3://${BUCKET}/lambda-layers/chronium-${CH_VERSION}.zip
aws lambda publish-layer-version \
--layer-name chronium-polotno \
--content "S3Bucket=${BUCKET},S3Key=lambda-layers/chronium-{CH_VERSION}.zip" \
--description Chronium-dev-${CH_VERSION} \
--compatible-architectures x86_64 \
--compatible-runtimes nodejs18.x
```

- Create a JS file for a Lambda's handler

```
// create a folder
mkdir handler && cd handler
// init a node project
npm init -y
// install dependencies
npm install --save polotno-node puppeteer-core@19.8.0
// create a file handler
touch index.mjs
// add code example
echo "
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { createInstance } from "polotno-node";
export const handler = () => {
  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      "--no-sandbox",
      "--hide-scrollbars",
      "--disable-web-security",
      "--allow-file-access-from-files",
      "--disable-dev-shm-usage",
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
    ignoreHTTPSErrors: true,
  });
  const polotnoInstance = await createInstance({
    key: process.env.POLOTNO_API_KEY,
    browser,
  });
  const body = polotnoInstance.jsonToImageBase64(event.json)

  return {
    StatusCode: 200,
    headers: {
      'Content-Type': 'image/png'
    },
    body,
  }
};
" >> index.mjs
// create file with variables
echo '{
    "Variables": {
      "POLOTNO_API_KEY": "your-api-key"
    }
  }
' >> vars.json
// archive the folder
zip -r index.zip ./*
// copy to S3
aws s3 cp index.zip s3://${BUCKET}/polotno-handler.zip
// crete a trust policy
echo '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
' >> trustPolicy.json
// create roles and policies
aws iam create-role --role-name lambda-polotno-role --assume-role-policy-document file://trustPolicy.json
aws iam attach-role-policy --role-name lambda-polotno-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws lambda create-function --function-name lambda-polotno \
--runtime nodejs18.x \
--zip-file fileb://index.zip \
--layers "arn:aws:lambda:eu-central-1:${AWS_ACC_ID}:layer:chronium-polotno:1" \
--handler index.handler \
--environment file://vars.json \
--role "arn:aws:iam::${AWS_ACC_ID}:role/lambda-polotno-role" \
--timeout 60 \
--memory-size 512
// try it
aws lambda invoke --function-name lambda-polotno --cli-binary-format raw-in-base64-out --payload file://polotno-project-json.json image
```

## Troubleshooting

If you have an error like this

```

Unhandled Promise Rejection {"errorType":"Runtime.UnhandledPromiseRejection","errorMessage":"Error: Evaluation failed: ReferenceError: store is not defined\n at **puppeteer_evaluation_script**:3:9"

```

It may mean that Polotno Client Editor was not loaded in `puppeteer` instance. It is possible that you are missing required files in `node_modules` folder. I got this error when I was trying to run `polotno-node` on Vercel. To fix the issue you need to add this config into `vercel.json`:

```json
"functions": {
  "api/render.js": { // remember to replace this line with your function name
    "includeFiles": "node_modules/polotno-node/\*\*"
  },
}
```
