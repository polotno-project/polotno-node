import { describe, test, expect } from 'vitest';
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
  function testWithInstance(name, fn, options = {}) {
    test.concurrent(name, async () => {
      const instance = await createInstance({ key, ...options });
      try {
        await fn(instance);
      } finally {
        await instance.close();
      }
    });
  }

  testWithInstance('sample export', async (instance) => {
    await matchImageSnapshot({
      jsonFileName: 'polotno-1.json',
      instance,
    });
  });

  testWithInstance('rich text support', async (instance) => {
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

  testWithInstance('vertical text align', async (instance) => {
    await matchImageSnapshot({
      jsonFileName: 'vertical-align.json',
      instance,
      attrs: {
        textVerticalResizeEnabled: true,
      },
    });
  });

  testWithInstance('optionally disable text fit', async (instance) => {
    await matchImageSnapshot({
      jsonFileName: 'resize-text.json',
      instance,
      attrs: {
        textOverflow: 'resize',
      },
    });
  });

  testWithInstance('vertical html text with align', async (instance) => {
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

  testWithInstance('fail on timeout', async (instance) => {
    const json = JSON.parse(
      fs.readFileSync(join(fixturesDir, 'polotno-1.json'))
    );
    await expect(
      instance.jsonToImageBase64(json, {
        assetLoadTimeout: 1,
      })
    ).rejects.toThrow();
  });

  testWithInstance('fail on font timeout', async (instance) => {
    const json = JSON.parse(
      fs.readFileSync(join(fixturesDir, 'polotno-with-text.json'))
    );

    await expect(
      instance.jsonToImageBase64(json, {
        fontLoadTimeout: 1,
      })
    ).rejects.toThrow();
  });

  testWithInstance(
    'Undefined fonts should fallback and we can skip it',
    async (instance) => {
      await matchImageSnapshot({
        jsonFileName: 'skip-font-error.json',
        instance,
        attrs: {
          skipFontError: true,
        },
      });
    }
  );

  testWithInstance('skip error on image loading', async (instance) => {
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
  testWithInstance('Bad font resize', async (instance) => {
    await matchImageSnapshot({
      jsonFileName: 'bad-font-resize.json',
      instance,
      attrs: {
        skipFontError: true,
      },
    });
  });

  test.concurrent('Allow split text', async () => {
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

  testWithInstance(
    'Should clear error with no parallel pages',
    async (instance) => {
      const json = JSON.parse(
        fs.readFileSync(join(fixturesDir, 'bad-image-url.json'))
      );
      try {
        await instance.jsonToDataURL(json);
      } catch (e) {
        expect(e.message).toContain('image');
      }
      const json2 = JSON.parse(
        fs.readFileSync(join(fixturesDir, 'polotno-1.json'))
      );
      await instance.jsonToDataURL(json2);
      expect(true).toBe(true);
    },
    { useParallelPages: false }
  );

  testWithInstance(
    'Should throw error when several task in the process for non parallel',
    async (instance) => {
      const json = JSON.parse(
        fs.readFileSync(join(fixturesDir, 'polotno-1.json'))
      );
      await expect(
        Promise.all([json, json].map((j) => instance.jsonToDataURL(j)))
      ).rejects.toThrow();
    },
    { useParallelPages: false }
  );

  testWithInstance(
    'Should not throw error when several task in sequence for non parallel',
    async (instance) => {
      const json = JSON.parse(
        fs.readFileSync(join(fixturesDir, 'polotno-1.json'))
      );
      await instance.jsonToDataURL(json);
      await instance.jsonToDataURL(json);
      expect(true).toBe(true);
    },
    { useParallelPages: false }
  );

  testWithInstance('buffer canvas rendering', async (instance) => {
    await matchImageSnapshot({
      jsonFileName: 'buffer-canvas.json',
      instance,
      attrs: {
        skipFontError: true,
      },
    });
  });

  testWithInstance('progress on pdf export', async (instance) => {
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
  testWithInstance('weird-image', async (instance) => {
    await matchImageSnapshot({
      jsonFileName: 'weird-image.json',
      instance,
    });
  });

  // image in this test is no usual
  testWithInstance('upper-case-resize', async (instance) => {
    await matchImageSnapshot({
      jsonFileName: 'upper-case-resize.json',
      instance,
    });
  });

  // font family name has characters that must be escaped
  testWithInstance('weird-font-family', async (instance) => {
    await matchImageSnapshot({
      jsonFileName: 'weird-font-family.json',
      instance,
    });
  });

  testWithInstance('render svg without defined size', async (instance) => {
    await matchImageSnapshot({
      jsonFileName: 'svg-without-size.json',
      instance,
    });
  });

  testWithInstance('render paragraphs with rich text', async (instance) => {
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
  testWithInstance(
    'render several pages with different fonts',
    async (instance) => {
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
    }
  );
});
