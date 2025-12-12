import { test, expect } from 'vitest';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { createInstance } from '../../index.js';
import { compareVideos } from './utils/compare-videos.mjs';

config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testDir = __dirname;
const fixturesDir = join(testDir, 'fixtures');
const goldensDir = join(testDir, 'goldens');
const outputDir = join(testDir, '..', 'output', 'video');
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

function getFixtureNames() {
  return fs
    .readdirSync(fixturesDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/, ''))
    .sort();
}

async function snapshot(name, options = {}) {
  const instance = await createInstance({
    key,
    executablePath:
      process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : undefined,
  });

  const jsonPath = join(fixturesDir, `${name}.json`);
  const currentPath = join(currentDir, `${name}.mp4`);
  const goldenPath = join(goldensDir, `${name}.mp4`);

  try {
    const json = JSON.parse(fs.readFileSync(jsonPath));

    await instance.jsonToVideo(json, {
      out: currentPath,
      fps: options.fps ?? 5,
      pixelRatio: options.pixelRatio ?? 1,
      textVerticalResizeEnabled: options.textVerticalResizeEnabled ?? false,
      onProgress: options.onProgress,
    });

    if (!fs.existsSync(goldenPath)) {
      fs.copyFileSync(currentPath, goldenPath);
      console.log(`Created new golden file: ${goldenPath}`);
      return;
    }

    const result = await compareVideos(currentPath, goldenPath, 98, {
      diffDir: join(diffDir, name),
    });
    return result;
  } finally {
    await instance.close();
  }
}

const testJSON = async (name, options = {}) => {
  const result = await snapshot(name, options);
  if (result) {
    expect(result.frameMismatchCount, 'Video frames should match').toBe(0);
    expect(result.audioMismatch, 'Audio should match').toBe(0);
  }
  expect(true).toBe(true);
};

/**
 * Auto-generated fixture tests
 *
 * Default behavior:
 * - Any `test/video/fixtures/<name>.json` will be rendered and compared against
 *   `test/video/goldens/<name>.mp4` (auto-golden creation if missing).
 *
 * Edge cases:
 * - Put per-fixture overrides and special expectations into `fixtureSpecs` below.
 */
const fixtureSpecs = {
  // Different render options
  'zoom-animation': { kind: 'snapshot', options: { fps: 24 } },
  'text-with-zoom-animation': { kind: 'snapshot', options: { fps: 24 } },
  'vertical-align': {
    kind: 'snapshot',
    options: { fps: 24, textVerticalResizeEnabled: true },
  },

  // Expected failures / error-shape assertions
  // it should fail for now as we don't support negative delays
  // TODO: handle in polotno-video-export package
  // 'negative-delay': {
  //   kind: 'throws',
  //   assert: (t, err) => {
  //     t.true(
  //       err.message.includes('Negative delay'),
  //       `Expected "Negative delay" error, got: ${err.message}`
  //     );
  //   },
  // },
  'bad-image': {
    kind: 'throws',
    maxDurationMs: 5000,
    toThrow: /Asset loading error/,
  },
  'manual-bad-video': {
    kind: 'throws',
    toThrow: /Asset loading error|Video failed to load|video with id/,
  },
};

for (const name of getFixtureNames()) {
  const spec = fixtureSpecs[name] || { kind: 'snapshot' };

  // if (name !== 'bad-image') {
  //   continue;
  // }
  if (spec.kind === 'throws') {
    test.concurrent(name, async () => {
      const startTime = Date.now();
      await expect(snapshot(name, spec.options)).rejects.toThrow(spec.toThrow);
      const durationMs = Date.now() - startTime;
      if (spec.maxDurationMs != null) {
        expect(durationMs, 'Should fail sooner on error').toBeLessThan(
          spec.maxDurationMs
        );
      }
    });
  } else {
    test.concurrent(name, async () => {
      await testJSON(name, spec.options);
    });
  }
}
