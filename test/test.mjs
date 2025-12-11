import test from 'ava';
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { createInstance } from '../index.js';
import { config } from 'dotenv';
config({ quiet: true });

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

async function matchImageSnapshot({
  jsonFileName,
  instance,
  t,
  attrs,
  tolerance = 0,
}) {
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
  if (numDiffPixels > tolerance) {
    console.log(numDiffPixels, tolerance);
    fs.writeFileSync(
      './test/samples/' + jsonFileName + '-diff.png',
      PNG.sync.write(diff)
    );
  }
  t.is(numDiffPixels, 0);
}

test('sample export', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  await matchImageSnapshot({
    jsonFileName: 'polotno-1.json',
    instance,
    t,
  });
});

test('rich text support', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  await matchImageSnapshot({
    jsonFileName: 'rich-text.json',
    instance,
    t,
    attrs: {
      richTextEnabled: true,
    },
    // sometimes is renders a bit differently
    //
    tolerance: 8000,
  });
});

test('vertical text align', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  await matchImageSnapshot({
    jsonFileName: 'vertical-align.json',
    instance,
    t,
    attrs: {
      textVerticalResizeEnabled: true,
    },
  });
});

test('optionally disable text fit', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  await matchImageSnapshot({
    jsonFileName: 'resize-text.json',
    instance,
    t,
    attrs: {
      textOverflow: 'resize',
    },
  });
});

test('vertical html text with align', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  await matchImageSnapshot({
    jsonFileName: 'vertical-align-html.json',
    instance,
    t,
    attrs: {
      textVerticalResizeEnabled: true,
      richTextEnabled: true,
      pixelRatio: 0.3,
    },
  });
});

test('fail on timeout', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  const json = JSON.parse(fs.readFileSync('./test/samples/polotno-1.json'));
  const error = await t.throwsAsync(async () => {
    await instance.jsonToImageBase64(json, {
      assetLoadTimeout: 1,
    });
  });
});

test('fail on font timeout', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  const json = JSON.parse(
    fs.readFileSync('./test/samples/polotno-with-text.json')
  );

  const error = await t.throwsAsync(async () => {
    await instance.jsonToImageBase64(json, {
      fontLoadTimeout: 1,
    });
  });
});

test('Undefined fonts should fallback and we can skip it', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  await matchImageSnapshot({
    jsonFileName: 'skip-font-error.json',
    instance,
    t,
    attrs: {
      skipFontError: true,
    },
  });
});

test('skip error on image loading', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  await matchImageSnapshot({
    jsonFileName: 'skip-image-error.json',
    instance,
    t,
    attrs: {
      skipImageError: true,
    },
  });
});

// when a text has bad font (we can't load it)
// we should still wait and then try to resize text to fit bounding box
test('Bad font resize', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  await matchImageSnapshot({
    jsonFileName: 'bad-font-resize.json',
    instance,
    t,
    attrs: {
      skipFontError: true,
    },
  });
});

test('Allow split text', async (t) => {
  const instances = [];
  t.teardown(() => Promise.all(instances.map((i) => i.close())));

  // run several iterations, because we had very rare cases when text was not split correctly
  for (let i = 0; i < 5; i++) {
    const instance = await createInstance({ key });
    instances.push(instance);
    await matchImageSnapshot({
      jsonFileName: 'allow-split.json',
      instance,
      t,
      attrs: {
        textSplitAllowed: true,
      },
    });
  }
});

test('Should clear error with no parallel pages', async (t) => {
  const instance = await createInstance({ key, useParallelPages: false });
  t.teardown(() => instance.close());

  const json = JSON.parse(fs.readFileSync('./test/samples/bad-image-url.json'));
  try {
    await instance.jsonToDataURL(json);
  } catch (e) {
    t.is(e.message.indexOf('image') > -1, true);
  }
  const json2 = JSON.parse(fs.readFileSync('./test/samples/polotno-1.json'));
  await instance.jsonToDataURL(json2);
  t.assert(true);
});

test('Should throw error when several task in the process for non parallel', async (t) => {
  const instance = await createInstance({ key, useParallelPages: false });
  t.teardown(() => instance.close());

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
  t.teardown(() => instance.close());

  const json = JSON.parse(fs.readFileSync('./test/samples/polotno-1.json'));
  await instance.jsonToDataURL(json);
  await instance.jsonToDataURL(json);
  t.assert(true);
});

test('buffer canvas rendering', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());
  await matchImageSnapshot({
    jsonFileName: 'buffer-canvas.json',
    instance,
    t,
    attrs: {
      skipFontError: true,
    },
  });
});

test('progress on pdf export', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  const json = { pages: [{ id: '1' }] };

  let progressCalled = false;
  await instance.jsonToPDFDataURL(json, {
    onProgress: () => {
      progressCalled = true;
    },
  });
  t.assert(progressCalled);
});

// image in this test is no usual
test('weird-image', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  await matchImageSnapshot({
    jsonFileName: 'weird-image.json',
    instance,
    t,
  });
});

// image in this test is no usual
test('upper-case-resize', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  await matchImageSnapshot({
    jsonFileName: 'upper-case-resize.json',
    instance,
    t,
  });
});

// font family name has characters that must be escaped
test('weird-font-family', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  await matchImageSnapshot({
    jsonFileName: 'weird-font-family.json',
    instance,
    t,
  });
});

test('render svg without defined size', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  await matchImageSnapshot({
    jsonFileName: 'svg-without-size.json',
    instance,
    t,
  });
});

test('render paragraphs with rich text', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  await matchImageSnapshot({
    jsonFileName: 'paragraphs.json',
    instance,
    attrs: {
      richTextEnabled: true,
    },
    t,
  });
});

// this test is tricky, I found a case when text on the second page was not rendered correctly
// because of complex order of page loading, font loading, etc.
// the task of the test is to render first page with font A, then second page with font A and B
// issue is only on page two
// we can't render ONLY second page, because without first page, the issue is not reproducible
test('render several pages with different fonts', async (t) => {
  const instance = await createInstance({ key });
  t.teardown(() => instance.close());

  const json = JSON.parse(
    fs.readFileSync('./test/samples/different-fonts.json')
  );
  const dataUrl = await instance.run(async (json) => {
    window.config.setRichTextEnabled(true);
    store.loadJSON(json);
    await store.toDataURL({ pageId: store.pages[0].id });
    return await store.toDataURL({ pageId: store.pages[1].id });
  }, json);
  const base64 = dataUrl.split('base64,')[1];
  fs.writeFileSync(
    './test/samples/different-fonts-current-export.png',
    base64,
    'base64'
  );
  // check snapshot version
  if (!fs.existsSync('./test/samples/different-fonts-export.png')) {
    fs.writeFileSync(
      './test/samples/different-fonts-export.png',
      base64,
      'base64'
    );
  }
  const img1 = PNG.sync.read(
    fs.readFileSync('./test/samples/different-fonts-current-export.png')
  );
  const img2 = PNG.sync.read(
    fs.readFileSync('./test/samples/different-fonts-export.png')
  );
  const { numDiffPixels, diff } = getPixelsDiff(img1, img2);
  if (numDiffPixels > 0) {
    fs.writeFileSync(
      './test/samples/different-fonts-diff.png',
      PNG.sync.write(diff)
    );
  }
  await instance.close();
  t.is(numDiffPixels, 0);
});
