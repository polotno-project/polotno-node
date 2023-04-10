import test from 'ava';
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { createInstance } from '../index.js';

test('sample export', async (t) => {
  const instance = await createInstance({
    key: 'nFA5H9elEytDyPyvKL7T',
  });

  const json = JSON.parse(fs.readFileSync('./test/samples/polotno-1.json'));
  const base64 = await instance.jsonToImageBase64(json);
  fs.writeFileSync(
    './test/samples/polotno-1-current-export.png',
    base64,
    'base64'
  );
  if (!fs.existsSync('./test/samples/polotno-1-export.png')) {
    fs.writeFileSync('./test/samples/polotno-1-export.png', base64, 'base64');
  }
  const img1 = PNG.sync.read(
    fs.readFileSync('./test/samples/polotno-1-current-export.png')
  );
  const img2 = PNG.sync.read(
    fs.readFileSync('./test/samples/polotno-1-export.png')
  );
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

  fs.writeFileSync('./test/samples/polotno-1-diff.png', PNG.sync.write(diff));
  t.is(numDiffPixels, 0);
});

test('fail on timeout', async (t) => {
  const instance = await createInstance({
    key: 'nFA5H9elEytDyPyvKL7T',
  });

  const json = JSON.parse(fs.readFileSync('./test/samples/polotno-1.json'));
  const error = await t.throwsAsync(async () => {
    await instance.jsonToImageBase64(json, {
      assetLoadTimeout: 1,
    });
  });
});
