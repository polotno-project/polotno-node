import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { createInstance } from '../../index.js';
import { config } from 'dotenv';
config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testDir = __dirname;
const fixturesDir = join(testDir, 'fixtures');
const goldensDir = join(testDir, 'goldens');
const outputDir = join(testDir, '..', 'output', 'static');
const currentDir = join(outputDir, 'current');
const diffDir = join(outputDir, 'diff');

// Ensure output directories exist
[outputDir, currentDir, diffDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

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
  attrs,
  tolerance = 0,
}) {
  const baseName = jsonFileName.replace('.json', '');
  const jsonPath = join(fixturesDir, jsonFileName);
  const goldenPath = join(goldensDir, `${baseName}.png`);
  const currentPath = join(currentDir, `${baseName}.png`);
  const diffPath = join(diffDir, `${baseName}.png`);

  // read json
  const json = JSON.parse(fs.readFileSync(jsonPath));
  // export to base64
  const base64 = await instance.jsonToImageBase64(json, attrs);
  // write current version
  fs.writeFileSync(currentPath, base64, 'base64');

  // check snapshot version - create if missing (auto-golden creation)
  if (!fs.existsSync(goldenPath)) {
    fs.writeFileSync(goldenPath, base64, 'base64');
    console.log(`Created new golden file: ${goldenPath}`);
  }

  // compare
  const img1 = PNG.sync.read(fs.readFileSync(currentPath));
  const img2 = PNG.sync.read(fs.readFileSync(goldenPath));
  const { numDiffPixels, diff } = getPixelsDiff(img1, img2);
  if (numDiffPixels > tolerance) {
    console.log(numDiffPixels, tolerance);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }
  expect(numDiffPixels).toBe(0);
}

describe('static export', () => {
  /** @type {import('../../index.js').Instance | undefined} */
  let instance;

  beforeEach(async () => {
    instance = await createInstance({ key });
  });

  afterEach(async () => {
    await instance?.close();
    instance = undefined;
  });

  test('sample export', async () => {
    await matchImageSnapshot({
      jsonFileName: 'polotno-1.json',
      instance,
    });
  });

  test('rich text support', async () => {
    await matchImageSnapshot({
      jsonFileName: 'rich-text.json',
      instance,
      attrs: {
        richTextEnabled: true,
      },
      // sometimes is renders a bit differently
      //
      tolerance: 8000,
    });
  });

  test('vertical text align', async () => {
    await matchImageSnapshot({
      jsonFileName: 'vertical-align.json',
      instance,
      attrs: {
        textVerticalResizeEnabled: true,
      },
    });
  });

  test('optionally disable text fit', async () => {
    await matchImageSnapshot({
      jsonFileName: 'resize-text.json',
      instance,
      attrs: {
        textOverflow: 'resize',
      },
    });
  });

  test('vertical html text with align', async () => {
    await matchImageSnapshot({
      jsonFileName: 'vertical-align-html.json',
      instance,
      attrs: {
        textVerticalResizeEnabled: true,
        richTextEnabled: true,
        pixelRatio: 0.3,
      },
    });
  });

  test('fail on timeout', async () => {
    const json = JSON.parse(
      fs.readFileSync(join(fixturesDir, 'polotno-1.json'))
    );
    await expect(
      instance.jsonToImageBase64(json, {
        assetLoadTimeout: 1,
      })
    ).rejects.toThrow();
  });

  test('fail on font timeout', async () => {
    const json = JSON.parse(
      fs.readFileSync(join(fixturesDir, 'polotno-with-text.json'))
    );

    await expect(
      instance.jsonToImageBase64(json, {
        fontLoadTimeout: 1,
      })
    ).rejects.toThrow();
  });

  test('Undefined fonts should fallback and we can skip it', async () => {
    await matchImageSnapshot({
      jsonFileName: 'skip-font-error.json',
      instance,
      attrs: {
        skipFontError: true,
      },
    });
  });

  test('skip error on image loading', async () => {
    await matchImageSnapshot({
      jsonFileName: 'skip-image-error.json',
      instance,
      attrs: {
        skipImageError: true,
      },
    });
  });

  // when a text has bad font (we can't load it)
  // we should still wait and then try to resize text to fit bounding box
  test('Bad font resize', async () => {
    await matchImageSnapshot({
      jsonFileName: 'bad-font-resize.json',
      instance,
      attrs: {
        skipFontError: true,
      },
    });
  });

  test('Allow split text', async () => {
    const instances = [];
    try {
      // run several iterations, because we had very rare cases when text was not split correctly
      for (let i = 0; i < 5; i++) {
        const instance = await createInstance({ key });
        instances.push(instance);
        await matchImageSnapshot({
          jsonFileName: 'allow-split.json',
          instance,
          attrs: {
            textSplitAllowed: true,
          },
        });
      }
    } finally {
      await Promise.all(instances.map((i) => i.close()));
    }
  });

  test('Should clear error with no parallel pages', async () => {
    // override: this test needs non-parallel instance
    const localInstance = await createInstance({
      key,
      useParallelPages: false,
    });
    const json = JSON.parse(
      fs.readFileSync(join(fixturesDir, 'bad-image-url.json'))
    );
    try {
      await localInstance.jsonToDataURL(json);
    } catch (e) {
      expect(e.message).toContain('image');
    }
    const json2 = JSON.parse(
      fs.readFileSync(join(fixturesDir, 'polotno-1.json'))
    );
    await localInstance.jsonToDataURL(json2);
    expect(true).toBe(true);
    await localInstance.close();
  });

  test('Should throw error when several task in the process for non parallel', async () => {
    // override: this test needs non-parallel instance
    const localInstance = await createInstance({
      key,
      useParallelPages: false,
    });
    const json = JSON.parse(
      fs.readFileSync(join(fixturesDir, 'polotno-1.json'))
    );
    await expect(
      Promise.all([json, json].map((j) => localInstance.jsonToDataURL(j)))
    ).rejects.toThrow();
    await localInstance.close();
  });

  test('Should not throw error when several task in sequence for non parallel', async () => {
    // override: this test needs non-parallel instance
    const localInstance = await createInstance({
      key,
      useParallelPages: false,
    });
    const json = JSON.parse(
      fs.readFileSync(join(fixturesDir, 'polotno-1.json'))
    );
    await localInstance.jsonToDataURL(json);
    await localInstance.jsonToDataURL(json);
    expect(true).toBe(true);
    await localInstance.close();
  });

  test('buffer canvas rendering', async () => {
    await matchImageSnapshot({
      jsonFileName: 'buffer-canvas.json',
      instance,
      attrs: {
        skipFontError: true,
      },
    });
  });

  test('progress on pdf export', async () => {
    const json = { pages: [{ id: '1' }] };

    let progressCalled = false;
    await instance.jsonToPDFDataURL(json, {
      onProgress: () => {
        progressCalled = true;
      },
    });
    expect(progressCalled).toBe(true);
  });

  // image in this test is no usual
  test('weird-image', async () => {
    await matchImageSnapshot({
      jsonFileName: 'weird-image.json',
      instance,
    });
  });

  // image in this test is no usual
  test('upper-case-resize', async () => {
    await matchImageSnapshot({
      jsonFileName: 'upper-case-resize.json',
      instance,
    });
  });

  // font family name has characters that must be escaped
  test('weird-font-family', async () => {
    await matchImageSnapshot({
      jsonFileName: 'weird-font-family.json',
      instance,
    });
  });

  test('render svg without defined size', async () => {
    await matchImageSnapshot({
      jsonFileName: 'svg-without-size.json',
      instance,
    });
  });

  test('render paragraphs with rich text', async () => {
    await matchImageSnapshot({
      jsonFileName: 'paragraphs.json',
      instance,
      attrs: {
        richTextEnabled: true,
      },
    });
  });

  // this test is tricky, I found a case when text on the second page was not rendered correctly
  // because of complex order of page loading, font loading, etc.
  // the task of the test is to render first page with font A, then second page with font A and B
  // issue is only on page two
  // we can't render ONLY second page, because without first page, the issue is not reproducible
  test('render several pages with different fonts', async () => {
    const json = JSON.parse(
      fs.readFileSync(join(fixturesDir, 'different-fonts.json'))
    );
    const dataUrl = await instance.run(async (json) => {
      window.config.setRichTextEnabled(true);
      store.loadJSON(json);
      await store.toDataURL({ pageId: store.pages[0].id });
      return await store.toDataURL({ pageId: store.pages[1].id });
    }, json);
    const base64 = dataUrl.split('base64,')[1];
    const baseName = 'different-fonts';
    const currentPath = join(currentDir, `${baseName}.png`);
    const goldenPath = join(goldensDir, `${baseName}.png`);
    const diffPath = join(diffDir, `${baseName}.png`);

    fs.writeFileSync(currentPath, base64, 'base64');
    // check snapshot version - create if missing (auto-golden creation)
    if (!fs.existsSync(goldenPath)) {
      fs.writeFileSync(goldenPath, base64, 'base64');
      console.log(`Created new golden file: ${goldenPath}`);
    }
    const img1 = PNG.sync.read(fs.readFileSync(currentPath));
    const img2 = PNG.sync.read(fs.readFileSync(goldenPath));
    const { numDiffPixels, diff } = getPixelsDiff(img1, img2);
    if (numDiffPixels > 0) {
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
    }
    expect(numDiffPixels).toBe(0);
  });
});
