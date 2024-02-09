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
  await instance.close();
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
  await instance.close();
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
  await instance.close();
});

test('optionally disable text fit', async (t) => {
  const instance = await createInstance({ key });

  await matchImageSnapshot({
    jsonFileName: 'resize-text.json',
    instance,
    t,
    attrs: {
      textOverflow: 'resize',
    },
  });
  await instance.close();
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
  await instance.close();
});

test('fail on timeout', async (t) => {
  const instance = await createInstance({ key });

  const json = JSON.parse(fs.readFileSync('./test/samples/polotno-1.json'));
  const error = await t.throwsAsync(async () => {
    await instance.jsonToImageBase64(json, {
      assetLoadTimeout: 1,
    });
  });
  await instance.close();
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
  await instance.close();
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
  await instance.close();
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
  await instance.close();
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
  await instance.close();
});

test('Should not throw error when several task in sequence for non parallel', async (t) => {
  const instance = await createInstance({ key, useParallelPages: false });
  const json = JSON.parse(fs.readFileSync('./test/samples/polotno-1.json'));
  await instance.jsonToDataURL(json);
  await instance.jsonToDataURL(json);
  t.assert(true);
  await instance.close();
});

test('buffer canvas rendering', async (t) => {
  const instance = await createInstance({ key });
  await matchImageSnapshot({
    jsonFileName: 'buffer-canvas.json',
    instance,
    t,
    attrs: {
      skipFontError: true,
    },
  });
  await instance.close();
});
