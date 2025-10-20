# Polotno-node

Export Polotno JSON into images and pdf files. NodeJS package to work with [Polotno SDK](https://polotno.com/).

> **🚀 Optimize Your Workflow with Cloud Render API!**
>
> Instead of managing your own server infrastructure with `polotno-node`, consider using our [Cloud Render API](https://polotno.com/cloud-render). It provides all the powerful export capabilities of Polotno with none of the server maintenance. Seamlessly convert your designs into images, PDFs, and videos at scale, with the reliability and speed of cloud-based rendering.
>
> **Get started now and focus on what truly matters—creating stunning designs!**

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

  // browserArgs - additional browser arguments to append to default args
  // see "Custom Browser Arguments" section for more details
  browserArgs: ['--custom-arg'],

  // requestInterceptor - optional function to intercept and modify network requests
  // Useful when you need to:
  // - Modify headers like User-Agent to access protected image resources
  // - Add authentication tokens or credentials to requests
  // - Log or monitor network traffic
  requestInterceptor: (request) => {
    const targetUrl = request.url();
    if (/\.(png|jpe?g)(\?|$)/i.test(targetUrl)) {
      console.log(`Modifying User-Agent for image request: ${targetUrl}`);
      request.continue({
        headers: {
          ...request.headers(),
          'User-Agent': 'MyCustomApprovedAgent/1.0',
        },
      });
    } else {
      request.continue();
    }
  },
});
```

### `createBrowser(options)`

Create a Puppeteer browser instance with optimized settings for Polotno rendering. This is useful when you want to create a browser separately from the instance.

```js
const { createBrowser, createInstance } = require('polotno-node');

// Create a browser
const browser = await createBrowser({
  browserArgs: ['--custom-arg'], // optional: additional browser arguments
  // ... any other puppeteer.launch options
});

// Create instance with the browser
const instance = await createInstance({
  key: 'your-key',
  browser: browser,
});
```

**Note:** `createBrowser()` automatically uses the optimized `args` for rendering. You can add custom arguments via the `browserArgs` parameter.

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

### `attrs.fontLoadTimeout`

Timeout for loading fonts. By default it is 6000ms.

```js
const url = await instance.jsonToPDFDataURL(json, { fontLoadTimeout: 10000 });
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

If `skipFontError` is true, it will not throw error font is not loaded or not defined. By default it is `false`, so it will throw error.

```js
const url = await instance.jsonToPDFDataURL(json, {
  skipFontError: true,
});
```

### `attrs.skipImageError`

If `skipImageError` is true, it will not throw error an can't be loaded. By default it is `false`, so it will throw error.

```js
const url = await instance.jsonToPDFDataURL(json, {
  skipImageError: true,
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

### `attrs.textSplitAllowed`

Additinal options to overflow behaviour. Default is `false`. It means the render will make sure no words are rendered into several lines. If you set it to `true`, the render will split words into several lines if needed without reducing font size.

```js
const url = await instance.jsonToPDFDataURL(json, {
  textSplitAllowed: true,
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

## Custom Browser Arguments

### Using `args` export

`polotno-node` exports a carefully curated set of Chrome arguments (`args`) that are optimized for server-side rendering. These arguments are automatically used when you call `createInstance()` without providing your own browser.

```js
const { args } = require('polotno-node');

console.log(args);
// Will show the default arguments like:
// ['--disable-web-security', '--allow-file-access-from-files', '--disable-gpu', ...]
```

**Platform compatibility:** Using `@sparticuz/chromium` args works best on **Linux** and **macOS**. On **Windows**, these args may not work as expected, so the library automatically skips them on Windows. When manually combining args, be aware of platform differences.

### Using with custom browser

When you want to use your own browser instance (e.g., with browserless.io or custom puppeteer configuration), you should combine `chrome.args` (the base defaults) with polotno-node's `args` (additional optimizations):

```js
const { createInstance, args } = require('polotno-node');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// Combine chrome.args (base defaults) with polotno-node's args (optimizations)
// This works best on Linux/macOS
const browser = await puppeteer.launch({
  args: [...chromium.args, ...args],
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: true,
  ignoreHTTPSErrors: true,
});

const instance = await createInstance({
  key: 'your-key',
  browser,
});
```

**Note:** `polotno-node`'s `args` are designed to work on top of `@sparticuz/chromium`'s args for optimal server-side rendering on Linux/macOS environments.

### Modifying default arguments

If you need to add, remove, or replace specific arguments (Linux/macOS):

```js
const { createInstance, args } = require('polotno-node');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// Add custom arguments on top of chrome.args and polotno args
const browser = await puppeteer.launch({
  args: [...chromium.args, ...args, '--custom-arg', '--another-custom-arg'],
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
});

// Remove specific arguments from polotno args
const filteredArgs = args.filter((arg) => arg !== '--disable-gpu');
const browser2 = await puppeteer.launch({
  args: [...chromium.args, ...filteredArgs],
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
});

// Replace specific arguments in polotno args
const customArgs = args.map((arg) =>
  arg === '--disable-web-security' ? '--enable-web-security' : arg
);
const browser3 = await puppeteer.launch({
  args: [...chromium.args, ...customArgs],
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
});
```

**Note:** These examples assume Linux/macOS environment where `chromium.args` work properly.

### Combining with `browserArgs` option

When using `createInstance()` or `createBrowser()`, you can provide additional arguments via `browserArgs` option. Internally, this automatically combines `chrome.args` + `args` + your custom `browserArgs`:

```js
const { createInstance } = require('polotno-node');

const instance = await createInstance({
  key: 'your-key',
  browserArgs: ['--custom-arg', '--another-arg'],
});
// Internally merges: chrome.args + polotno args + browserArgs
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

### AWS Lambda

`polotno-node` works with AWS Lambda out of the box. Here's a simple example:

```js
const { createInstance } = require('polotno-node');

export const handler = async (event) => {
  const instance = await createInstance({
    key: process.env.POLOTNO_API_KEY,
  });

  const base64 = await instance.jsonToImageBase64(event.json);

  await instance.close();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/png',
    },
    body: base64,
  };
};
```

**Important:** For reliable performance, you may need to increase AWS Lambda limits:

- **Memory**: Increase from the default. For complex designs, you may need to set it to maximum.
- **Timeout**: Increase from the default. For large files, you may need to set it to maximum.
- **Ephemeral Storage**: May need to increase from the default for complex designs.

Without these increases, polotno-node may work on smaller files but will fail or timeout on larger files.

**Full working example:** See [polotno-node-aws-lambda](https://github.com/polotno-project/polotno-node-aws-lambda) for a complete demo.

#### AWS Lambda with Layers (Optional)

For advanced usage, you can use [Lambda Layers](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html) to manage dependencies like chromium separately. This can help with deployment size and organization.

**Dependencies:**

- @sparticuz/chromium
- puppeteer-core
- polotno-node

**Requirements:**

- The chromium and puppeteer versions need to be compatible. Please check this [document](https://pptr.dev/supported-browsers).
- The **Memory limit** needs to be increased from the default. You may need to set it to maximum for complex designs.
- The **timeout** should be increased from the default. You may need to set it to maximum for large files.

**Creating a Lambda Layer with chromium:**

1. Create a `.zip` file from a chromium project:

```shell
mkdir chromium-112 && cd chromium-112

npm init -y
npm install @sparticuz/chromium@112.0

zip -r chromium.zip ./*
```

2. Go to AWS console then open Lambda section and click on `Layers`.
3. Following the [documentation](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html) create a Layer with a chromium dependency by uploading a zip file. Keep in mind that environment like `nodejs18.x` should match between layer and function.

> The size of the zip will be large, so you may need to use S3 to upload it.

4. Finally, open the Lambda function, select a `Code` section, at the bottom click on `Add Layer` and select a created layer.

**Handler code with custom chromium:**

Create `index.mjs`:

```js
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { createInstance, args } from 'polotno-node';

export const handler = async (event) => {
  const browser = await puppeteer.launch({
    // Combine chromium args with polotno-node's optimized args
    // Works well on AWS Lambda (Linux environment)
    args: [...chromium.args, ...args],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
    ignoreHTTPSErrors: true,
  });

  const polotnoInstance = await createInstance({
    key: process.env.POLOTNO_API_KEY,
    browser,
  });

  const body = await polotnoInstance.jsonToImageBase64(event.json);

  await polotnoInstance.close();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/png',
    },
    body,
  };
};
```

#### AWS Lambda fonts issue

Lambda functions do not include any fonts by default. If you encounter `Timeout for loading font <font name>` errors, you need to provide basic fonts (Arial and Times or their analogs).

<details>
<summary>Solution: Add fonts to your Lambda function</summary>

1. Create a `fonts` folder in the root of your handler project.

```shell
mkdir fonts
```

2. Put the `Arial.ttf` and `Times.ttf` files into the `fonts` folder. You can get them from your system fonts folder.
3. Usage of fonts analogues is also possible:

   1. If you don't want to use system Arial and Times fonts, you can use [Liberation Fonts](https://github.com/liberationfonts/liberation-fonts) as free alternative. Download fonts from repository. Put `LiberationMono-Regular.ttf` and `LiberationSans-Regular.ttf` inside `fonts` folder.
   2. Create file `fonts.conf` inside `fonts` folder. It should contain the following lines:

   ```xml
   <?xml version="1.0"?>
   <!DOCTYPE fontconfig SYSTEM "fonts.dtd">
   <fontconfig>
   <alias>
     <family>Arial</family>
     <prefer>
       <family>Liberation Sans</family>
     </prefer>
   </alias>
   <alias>
     <family>Times New Roman</family>
     <prefer>
       <family>Liberation Serif</family>
     </prefer>
   </alias>

   <dir>/var/task/fonts</dir>
   </fontconfig>
   ```

4. Upload your Lambda function as usual, fonts will be loaded automatically.

</details>

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
// (!) loading from polotno-node/instance will not import puppeteer and chromium-min dependencies
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
// Import args from main entry point for optimal browser configuration
const { args } = require('polotno-node');
const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

const makeInstance = async () => {
  const browser = await puppeteer.launch({
    // Combine chromium args with polotno-node's optimized args
    // Best for Linux/macOS environments
    args: [...chromium.args, ...args],
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

## Troubleshooting

If you have an error like this

```

Unhandled Promise Rejection {"errorType":"Runtime.UnhandledPromiseRejection","errorMessage":"Error: Evaluation failed: ReferenceError: store is not defined\n at **puppeteer_evaluation_script**:3:9"

```

It may mean that Polotno Client Editor was not loaded in `puppeteer` instance. It is possible that you are missing required files in `node_modules` folder. I got this error when I was trying to run `polotno-node` on Vercel. To fix the issue you need to add this config into `vercel.json`:

```json
{
  "functions": {
    "api/render.js": {
      // remember to replace this line with your function name
      "includeFiles": "node_modules/polotno-node/**"
    }
  }
}
```
