const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const path = require('path');

const downloadVideo = async (url, destination) => {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
  });

  const writer = response.data.pipe(fs.createWriteStream(destination));

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

// 2. Convert it into webm format

const convertToWebM = (input, output) => {
  console.log(input, output);
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions(['-c:v libvpx', '-crf 30', '-b:v 1000k'])
      .output(output)
      .on('start', () => {
        console.log('Conversion started...');
      })
      .on('end', () => {
        console.log('Conversion ended successfully');
        resolve();
      })
      .on('error', (err) => {
        console.log('Error occurred: ' + err.message);
        reject(err);
      })
      .run();
  });
};

// 3. Serialize file into dataurl string
const fileToDataUrl = (filename) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, 'base64', (err, data) => {
      if (err) reject(err);
      resolve(`data:video/webm;base64,${data}`);
    });
  });
};

const videoToDataURL = async (url) => {
  const destination = path.join('./tmp', 'video.mp4');
  await downloadVideo(url, destination);
  const webmFile = destination.replace('.mp4', '.webm');
  await convertToWebM(destination, webmFile);
  const dataUrl = await fileToDataUrl(webmFile);
  return dataUrl;
};

module.exports.jsonToVideoFile = async function jsonToGifFile(
  page,
  json,
  attrs
) {
  fs.rmdirSync('./tmp', { recursive: true });
  fs.mkdirSync('./tmp', { recursive: true });

  for (const page of json.pages) {
    for (const el of page.children) {
      if (el.type === 'video') {
        el.src = await videoToDataURL(el.src);
      }
    }
  }
  // first load json
  await page.evaluate(
    async (json, attrs) => {
      store.loadJSON(json);
      await store.waitLoading();
    },
    json,
    attrs || {}
  );

  const duration = await page.evaluate(async () => {
    return store.duration;
  });

  const fps = 15;

  // loop through the images and add each to the animation
  const frames = Math.floor((duration / 1000) * fps);
  for (let i = 0; i < frames; i++) {
    const currentTime = i * 100;
    console.time('render');
    const dataURL = await page.evaluate(
      async (json, attrs, currentTime) => {
        store.setCurrentTime(currentTime + 1);
        const url = await store.toDataURL({ ...attrs, pixelRatio: 0.01 });
        return url;
      },
      json,
      attrs || {},
      currentTime
    );
    console.timeEnd('render');
    const progress = ((i / frames) * 100).toFixed(1);
    console.log(`Progress: ${progress}%`);
    fs.mkdirSync('./tmp', { recursive: true });
    fs.writeFileSync(`./tmp/${i}.png`, dataURL.split(',')[1], 'base64');
  }
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`./tmp/%d.png`) // Make sure your images are named with numbers, e.g. 1.jpg, 2.jpg, etc.
      .inputFPS(fps)
      .videoCodec('libx264')
      .outputOptions('-pix_fmt yuv420p')
      .format('mp4')
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(attrs.out);
  });
};
