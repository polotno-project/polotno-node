import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import { promisify } from 'util';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { AudioContext } from 'web-audio-api';
import { createHash } from 'crypto';

import tmp from 'tmp';
tmp.setGracefulCleanup();

const getVideoInfo = promisify(ffmpeg.ffprobe);

// Helper function to calculate file hash
async function calculateFileHash(filePath) {
  const fileHandle = await fs.open(filePath, 'r');
  const hashSum = createHash('md5');

  try {
    const stats = await fileHandle.stat();
    const fileSize = stats.size;
    const partSize = Math.floor(fileSize / 10);
    const buffer = Buffer.alloc(partSize);

    async function readAndHashPart(position) {
      const { bytesRead } = await fileHandle.read(
        buffer,
        0,
        partSize,
        position
      );
      if (bytesRead > 0) hashSum.update(buffer.slice(0, bytesRead));
    }

    await readAndHashPart(0);
    await readAndHashPart(Math.max(fileSize - partSize, 0));
  } finally {
    await fileHandle.close();
  }

  return hashSum.digest('hex');
}

export async function compareVideos(
  video1Path,
  video2Path,
  similarityThreshold,
  { diffDir } = {}
) {
  const [hash1, hash2] = await Promise.all([
    calculateFileHash(video1Path),
    calculateFileHash(video2Path),
  ]);

  if (hash1 === hash2) {
    return {
      frameMismatchCount: 0,
      audioMismatch: 0,
    };
  }

  const [info1, info2] = await Promise.all([
    getVideoInfo(video1Path),
    getVideoInfo(video2Path),
  ]);

  if (Math.abs(info1.format.duration - info2.format.duration) > 0.05) {
    throw new Error('Video durations do not match');
  }

  if (info1.streams[0].r_frame_rate !== info2.streams[0].r_frame_rate) {
    throw new Error('Video fps do not match');
  }

  if (
    Math.abs(info1.format.size - info2.format.size) / info1.format.size >
    0.1
  ) {
    const size1mb = (info1.format.size / 1024 / 1024).toFixed(2);
    const size2mb = (info2.format.size / 1024 / 1024).toFixed(2);
    console.warn(
      `Video sizes differ significantly: ${size1mb}mb vs ${size2mb}mb`
    );
  }

  const frameMismatchCount = await compareFrames(
    video1Path,
    video2Path,
    similarityThreshold,
    diffDir
  );

  const hasAudio1 = info1.streams.some(
    (stream) => stream.codec_type === 'audio'
  );
  const hasAudio2 = info2.streams.some(
    (stream) => stream.codec_type === 'audio'
  );

  let audioMismatch = 0;
  if (hasAudio1 && hasAudio2) {
    audioMismatch = await compareAudio(
      video1Path,
      video2Path,
      similarityThreshold
    );
  } else if (hasAudio1 !== hasAudio2) {
    audioMismatch = 1;
  }

  return {
    frameMismatchCount,
    audioMismatch,
  };
}

async function compareFrames(
  video1Path,
  video2Path,
  similarityThreshold,
  diffDir
) {
  let mismatchCount = 0;
  const tempFolder = tmp.dirSync();
  const tempDir = tempFolder.name;

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(video1Path)
        .output(`${tempDir}/frame1_%d.png`)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    await new Promise((resolve, reject) => {
      ffmpeg(video2Path)
        .output(`${tempDir}/frame2_%d.png`)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    const files = await fs.readdir(tempDir);
    const frameCount = files.length / 2;

    for (let i = 1; i <= frameCount; i++) {
      const img1 = PNG.sync.read(
        await fs.readFile(`${tempDir}/frame1_${i}.png`)
      );
      const img2 = PNG.sync.read(
        await fs.readFile(`${tempDir}/frame2_${i}.png`)
      );

      const { width, height } = img1;
      const diff = new PNG({ width, height });

      const mismatchedPixels = pixelmatch(
        img1.data,
        img2.data,
        diff.data,
        width,
        height,
        { threshold: 0.1 }
      );

      const mismatchPercentage =
        Math.sqrt(mismatchedPixels / (width * height)) * 100;

      if (mismatchPercentage > 100 - similarityThreshold) {
        mismatchCount++;

        if (diffDir) {
          await fs.mkdir(diffDir, { recursive: true });
          const diffBuffer = PNG.sync.write(diff);
          await fs.writeFile(`${diffDir}/frame_${i}.png`, diffBuffer);
        }
      }
    }
  } finally {
    await fs.rm(tempFolder.name, { recursive: true, force: true });
  }

  return mismatchCount;
}

async function compareAudio(video1Path, video2Path, similarityThreshold) {
  const [audio1, audio2] = await Promise.all([
    extractAudio(video1Path),
    extractAudio(video2Path),
  ]);

  const context = new AudioContext();
  const [buffer1, buffer2] = await Promise.all([
    decodeAudioData(context, audio1),
    decodeAudioData(context, audio2),
  ]);

  const channel1 = buffer1.getChannelData(0);
  const channel2 = buffer2.getChannelData(0);

  let mismatchCount = 0;
  const minLength = Math.min(channel1.length, channel2.length);

  for (let i = 0; i < minLength; i++) {
    if (Math.abs(channel1[i] - channel2[i]) > 1 - similarityThreshold / 100) {
      mismatchCount++;
    }
  }

  return mismatchCount / minLength;
}

async function extractAudio(videoPath) {
  const tempFolder = tmp.dirSync();
  const tempDir = tempFolder.name;
  const outputPath = `${tempDir}/audio.wav`;

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(outputPath)
        .audioCodec('pcm_s16le')
        .on('end', resolve)
        .on('error', (err) => {
          console.error('FFmpeg error:', err.message);
          reject(err);
        })
        .run();
    });

    const audioData = await fs.readFile(outputPath);
    return audioData;
  } catch (error) {
    console.error('Error extracting audio:', error);
    throw error;
  } finally {
    await fs.rm(tempFolder.name, { recursive: true, force: true });
  }
}

function decodeAudioData(context, audioData) {
  return new Promise((resolve, reject) => {
    context.decodeAudioData(audioData, resolve, reject);
  });
}
