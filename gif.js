const fs = require('fs');
const { createCanvas, Image, loadImage } = require('canvas');
const GIFEncoder = require('gifencoder');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');

// Download the video using axios
const downloadVideo = async (videoUrl, file) => {
  const response = await axios({
    url: videoUrl,
    method: 'GET',
    responseType: 'stream',
  });
  // Create a new ffmpeg command
  const command = ffmpeg()
    .input(response.data)
    .outputOptions('-c:v libx264')
    .outputOptions('-crf 20')
    .outputOptions('-preset veryfast')
    .outputOptions('-pix_fmt yuv420p')
    .outputOptions('-movflags frag_keyframe+empty_moov')
    .output(file);

  // Run the ffmpeg command
  command.run();
};

module.exports.jsonToGifFile = async function jsonToGifFile(page, json, attrs) {
  // create a canvas with the same dimensions as the images
  const canvas = createCanvas(json.width, json.height);
  const ctx = canvas.getContext('2d');

  // create a GIF encoder
  const encoder = new GIFEncoder(json.width, json.height);
  const stream = encoder.createReadStream();
  stream.pipe(fs.createWriteStream(attrs.out));

  encoder.start();
  encoder.setRepeat(0); // 0 = repeat forever
  encoder.setDelay(100); // frame delay in ms
  encoder.setQuality(10); // lower is better

  for (const page of json.pages) {
    for (const el of page.children) {
      if (el.type === 'video') {
        const { src } = el;
        const file = './dist/' + el.id + '.mp4';
        await downloadVideo(src, file);
        // el.src = 'file://' + el.id + '.avi';
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

  // loop through the images and add each to the animation
  const frames = 10;
  for (let i = 0; i < frames; i++) {
    const currentTime = i * 1000;
    const dataURL = await page.evaluate(
      async (json, attrs, currentTime) => {
        store.setCurrentTime(currentTime);
        return await store.toDataURL({ ...attrs, pixelRatio: 1 });
      },
      json,
      attrs || {},
      currentTime
    );
    const image = await loadImage(dataURL);
    ctx.drawImage(image, 0, 0, json.width, json.height);
    encoder.addFrame(ctx);
  }
  // finish the animation
  encoder.finish();
  return new Promise((resolve) => {
    setTimeout(resolve, 10000);
  });
};
