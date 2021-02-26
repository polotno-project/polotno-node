# Polotno-node

NodeJS package to work with [Polotno Framework](https://polotno.dev/).

## Usage

```bash
npm install polotno-node
```

```js
const fs = require('fs');
const { createInstance } = require('./index');

async function run() {
  // create working instance
  const instance = await createInstance({ key: 'nFA5H9elEytDyPyvKL7T' });

  // load sample json
  const json = JSON.parse(fs.readFileSync('polotno.json'));

  // execute loading of JSON and export to image
  // we can't directly use "json" variable inside the run function
  // we MUST pass it as the second argument
  const url = await instance.run(async (json) => {
    store.loadJSON(json);
    await store.waitLoading();
    return store.toDataURL();
  }, json);

  // prepare base64 string to save
  var base64Data = url.replace(/^data:image\/png;base64,/, '');

  // save it to local file
  require('fs').writeFileSync('out.png', base64Data, 'base64');

  // close instance
  instance.close();
}

run();
```