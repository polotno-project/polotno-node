import test from 'ava';
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { createInstance } from '../index.js';
import { config } from 'dotenv';
config();

const key = process.env.POLOTNO_KEY;

if (!key) {
  console.error('Please set POLOTNO_KEY env variable');
}

function getPixelsDiff(img1, img2) {
  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    {
      threshold: 0.1,
    }
  );

  return { numDiffPixels, diff };
}

async function matchImageSnapshot({ jsonFileName, instance, t, attrs }) {
  // read json
  const json = JSON.parse(fs.readFileSync('./test/samples/' + jsonFileName));
  // export to base64
  const base64 = await instance.jsonToImageBase64(json, attrs);
  // write current version
  fs.writeFileSync(
    './test/samples/' + jsonFileName + '-current-export.png',
    base64,
    'base64'
  );
  // check snapshot version
  if (!fs.existsSync('./test/samples/' + jsonFileName + '-export.png')) {
    fs.writeFileSync(
      './test/samples/' + jsonFileName + '-export.png',
      base64,
      'base64'
    );
  }
  // compare
  const img1 = PNG.sync.read(
    fs.readFileSync('./test/samples/' + jsonFileName + '-current-export.png')
  );
  const img2 = PNG.sync.read(
    fs.readFileSync('./test/samples/' + jsonFileName + '-export.png')
  );
  const { numDiffPixels, diff } = getPixelsDiff(img1, img2);
  if (numDiffPixels > 0) {
    fs.writeFileSync(
      './test/samples/' + jsonFileName + '-diff.png',
      PNG.sync.write(diff)
    );
  }
  t.is(numDiffPixels, 0);
}

test('sample export', async (t) => {
  const instance = await createInstance({ key });

  await matchImageSnapshot({
    jsonFileName: 'polotno-1.json',
    instance,
    t,
  });
});

test('rich text support', async (t) => {
  const instance = await createInstance({ key });

  await matchImageSnapshot({
    jsonFileName: 'rich-text.json',
    instance,
    t,
    attrs: {
      htmlTextRenderEnabled: true,
    },
  });
});

test('vertical text align', async (t) => {
  const instance = await createInstance({ key });

  await matchImageSnapshot({
    jsonFileName: 'vertical-align.json',
    instance,
    t,
    attrs: {
      textVerticalResizeEnabled: true,
    },
  });
});

test('vertical html text with align', async (t) => {
  const instance = await createInstance({ key });

  await matchImageSnapshot({
    jsonFileName: 'vertical-align-html.json',
    instance,
    t,
    attrs: {
      textVerticalResizeEnabled: true,
      htmlTextRenderEnabled: true,
      pixelRatio: 0.3,
    },
  });
});

test('fail on timeout', async (t) => {
  const instance = await createInstance({ key });

  const json = JSON.parse(fs.readFileSync('./test/samples/polotno-1.json'));
  const error = await t.throwsAsync(async () => {
    await instance.jsonToImageBase64(json, {
      assetLoadTimeout: 1,
    });
  });
});

test('Undefined fonts should fallback and we can skip it', async (t) => {
  const instance = await createInstance({ key });

  await matchImageSnapshot({
    jsonFileName: 'skip-font-error.json',
    instance,
    t,
    attrs: {
      skipFontError: true,
    },
  });
});

// when a text has bad font (we can't load it)
// we should still wait and then try to resize text to fit bounding box
test('Bad font resize', async (t) => {
  const instance = await createInstance({ key });

  await matchImageSnapshot({
    jsonFileName: 'bad-font-resize.json',
    instance,
    t,
    attrs: {
      skipFontError: true,
    },
  });
});

test('Should clear error with no parallel pages', async (t) => {
  const instance = await createInstance({ key, useParallelPages: false });
  const json = JSON.parse(fs.readFileSync('./test/samples/bad-image-url.json'));
  try {
    await instance.jsonToDataURL(json);
  } catch (e) {
    t.is(e.message, 'image 2YuCaDrZFa');
  }
  const json2 = JSON.parse(fs.readFileSync('./test/samples/polotno-1.json'));
  await instance.jsonToDataURL(json2);
  t.assert(true);
});

test('Should throw error when several task in the process for non parallel', async (t) => {
  const instance = await createInstance({ key, useParallelPages: false });
  const json = JSON.parse(fs.readFileSync('./test/samples/polotno-1.json'));
  try {
    await Promise.all([json, json].map((j) => instance.jsonToDataURL(j)));
    t.assert(false, 'no error triggered');
  } catch (e) {
    t.assert(true, 'error triggered');
  }
});

test('Should not throw error when several task in sequence for non parallel', async (t) => {
  const instance = await createInstance({ key, useParallelPages: false });
  const json = JSON.parse(fs.readFileSync('./test/samples/polotno-1.json'));
  await instance.jsonToDataURL(json);
  await instance.jsonToDataURL(json);
  t.assert(true);
});
