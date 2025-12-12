import test from 'ava';
import { config } from 'dotenv';
import fs from 'fs';
import { createInstance } from '../index.js';
import { compareVideos } from './compare-videos.mjs';

config({ quiet: true });

const key = process.env.POLOTNO_KEY;

if (!key) {
  console.error('Please set POLOTNO_KEY env variable');
}

async function snapshot(jsonPath, options = {}) {
  const instance = await createInstance({
    key,
    executablePath:
      process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : undefined,
  });

  try {
    const json = JSON.parse(fs.readFileSync(jsonPath));
    const videoPath = jsonPath.replace('.json', '-current.mp4');

    await instance.jsonToVideo(json, {
      out: videoPath,
      fps: options.fps || 5,
      pixelRatio: options.pixelRatio || 1,
      textVerticalResizeEnabled: options.textVerticalResizeEnabled || false,
      onProgress: options.onProgress,
    });

    const canonicalPath = jsonPath.replace('.json', '-canonical.mp4');
    if (!fs.existsSync(canonicalPath)) {
      fs.copyFileSync(videoPath, canonicalPath);
      console.log(`Created new canonical file: ${canonicalPath}`);
      return;
    }

    const result = await compareVideos(videoPath, canonicalPath, 98);
    return result;
  } finally {
    await instance.close();
  }
}

const testJSON = async (t, jsonPath, options = {}) => {
  const result = await snapshot(jsonPath, options);
  if (result) {
    t.is(result.frameMismatchCount, 0, 'Video frames should match');
    t.is(result.audioMismatch, 0, 'Audio should match');
  }
  t.pass();
};

test('design with animations', async (t) => {
  await testJSON(t, './video-test/test/samples/animation.json');
});

test('video with audio in it', async (t) => {
  await testJSON(t, './video-test/test/samples/video-with-audio.json');
});

test('video with audio in it and several pages', async (t) => {
  await testJSON(
    t,
    './video-test/test/samples/several-videos-several-pages.json'
  );
});

test('simple audio overlay', async (t) => {
  await testJSON(t, './video-test/test/samples/simple-audio-overlay.json');
});

test('design with muted video and audio overlay', async (t) => {
  await testJSON(t, './video-test/test/samples/muted-video-audio-overlay.json');
});

test('several audios with different volume', async (t) => {
  await testJSON(
    t,
    './video-test/test/samples/several-audios-different-volume.json'
  );
});

test('design with several audios and several pages', async (t) => {
  await testJSON(
    t,
    './video-test/test/samples/several-audios-several-pages.json'
  );
});

test('design with several audios and several pages and clip audio', async (t) => {
  await testJSON(
    t,
    './video-test/test/samples/several-audios-several-pages-clip-audio.json'
  );
});

test('text-overflow', async (t) => {
  await testJSON(t, './video-test/test/samples/text-overflow.json');
});

test('several-pages-text-overflow', async (t) => {
  await testJSON(
    t,
    './video-test/test/samples/several-pages-text-overflow.json'
  );
});

test('fail-test', async (t) => {
  await testJSON(t, './video-test/test/samples/fail-test.json');
});

test('transparent-video', async (t) => {
  await testJSON(t, './video-test/test/samples/transparent-video.json');
});

// it should fail for now as we don't support negative delays
test('negative-delay', async (t) => {
  try {
    // this fail has bad image on third page
    // so it will trigger an error
    // so all other threads must be killed
    await testJSON(t, './video-test/test/samples/negative-delay.json');
  } catch (e) {
    console.log(11, e.message);
    t.true(e.message.includes('Negative delay'));
  }
});

test('zoom-animation', async (t) => {
  await testJSON(t, './video-test/test/samples/zoom-animation.json', {
    fps: 24,
  });
});

test('vertical-align', async (t) => {
  await testJSON(t, './video-test/test/samples/vertical-align.json', {
    fps: 24,
    textVerticalResizeEnabled: true,
  });
});

test('text-with-zoom-animation', async (t) => {
  await testJSON(t, './video-test/test/samples/text-with-zoom-animation.json', {
    fps: 24,
  });
});

test('should fail sooner on error', async (t) => {
  const startTime = Date.now();
  try {
    // this fail has bad image on third page
    // so it will trigger an error
    // so all other threads must be killed
    await testJSON(t, './video-test/test/samples/bad-image.json');
  } catch (e) {
    const endTime = Date.now();
    t.is(endTime - startTime < 5000, true, 'Should fail sooner on error');
  }
});

test('good error message on video error', async (t) => {
  try {
    // this fail has bad image on third page
    // so it will trigger an error
    // so all other threads must be killed
    await testJSON(t, './video-test/test/samples/manual-bad-video.json');
  } catch (e) {
    // The exact message may vary depending on where the failure is detected:
    // - our instance wrapper: "Asset loading error: ..."
    // - polotno video element: "Video failed to load: ..."
    // - some loaders: "video with id ... url: ..."
    t.true(
      e.message.includes('Asset loading error') ||
        e.message.includes('Video failed to load') ||
        e.message.includes('video with id'),
      e.message
    );
  }
});
